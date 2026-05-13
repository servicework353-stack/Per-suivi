import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

console.log(`Admin credentials configured: Username="${ADMIN_USERNAME}", Password="${ADMIN_PASSWORD.substring(0, 2)}***"`);

// --- DATABASE ABSTRACTION ---
let db: any;
const connectionString = process.env.DATABASE_URL;
let dbMode: 'postgres' | 'sqlite' = 'sqlite';

// Database query helper with retry logic
const query = async (text: string, params?: any[]) => {
  if (dbMode !== 'postgres') return null;
  let retries = 5; // Plus de tentatives pour Render Free
  let delay = 2000; // Délai initial plus long
  while (retries >= 0) {
    try {
      return await db.query(text, params);
    } catch (err: any) {
      const msg = err.message || "";
      const isTransient = 
        msg.includes("terminated unexpectedly") || 
        msg.includes("is closed") || 
        msg.includes("ECONNRESET") || 
        msg.includes("connection timeout") ||
        msg.includes("socket hang up") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("SSL connection has been closed unexpectedly");

      if (retries > 0 && isTransient) {
        console.warn(`Postgres transient error, retrying in ${delay}ms (${retries} left): ${msg}`);
        retries--;
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, 8000); // Backoff progressif
        continue;
      }
      throw err;
    }
  }
};

if (connectionString && !connectionString.startsWith("https://")) {
  console.log("--- PRODUCTION MODE: Trying PostgreSQL ---");
  
  // Check for common [YOUR-PASSWORD] mistake
  if (connectionString.includes("[YOUR-PASSWORD]") || connectionString.includes("[PASSWORD]")) {
    console.warn("!!! WARNING: Your DATABASE_URL contains placeholder '[YOUR-PASSWORD]'. Please replace it with your real password in the app settings.");
  }

  try {
    let trimmedConn = (connectionString || "").trim();
    
    // Auto-fix Render Internal URL to External
    if (trimmedConn.includes("render.com") || trimmedConn.includes("dpg-")) {
      // 1. Remove the '-a' which indicates internal routing
      // We look for -a before dots, colons, slashes or end of hostname
      if (trimmedConn.match(/-a(?=\.|\:|\/|$)/)) {
        console.warn("!!! AUTO-FIX: Internal Render URL detected (-a). Fixing...");
        trimmedConn = trimmedConn.replace(/-a(?=\.|\:|\/|$)/g, "");
      }
      
      // 2. If the user copied the simple host (dpg-xxxxxx) or missing domain
      const hostPart = trimmedConn.split('@')[1]?.split('/')[0];
      if (hostPart && !hostPart.includes(".render.com")) {
        console.warn("!!! AUTO-FIX: Missing domain in Render URL. Appending .frankfurt-postgres.render.com...");
        trimmedConn = trimmedConn.replace(/(@dpg-[^/:]+)/, "$1.frankfurt-postgres.render.com");
      }
    }

    db = new Pool({
      connectionString: trimmedConn,
      ssl: { rejectUnauthorized: false },
      max: 2, 
      idleTimeoutMillis: 1000, // Fermeture rapide pour éviter que Render ne les tue silencieusement
      connectionTimeoutMillis: 30000, 
      query_timeout: 60000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 30000 // Plus fréquent
    });

    db.on('error', (err: any) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
      // If the error is serious, we might want to flag it for the status check
    });

    // Keep-alive: Ping the database every 45 seconds
    const intervalId = setInterval(async () => {
      try {
        await query('SELECT 1');
      } catch (e: any) {
        if (e.message.includes("Connection terminated unexpectedly") || e.message.includes("is closed")) {
          console.warn('Postgres connection lost. Pool will attempt to recover on next query.');
        } else {
          console.error('Postgres keep-alive ping error:', e.message);
        }
      }
    }, 45000);

    dbMode = 'postgres';
    
    // Redact password for logging
    const redacted = trimmedConn.replace(/:([^:@]+)@/, ":****@");
    console.log(`Database initialized in ${dbMode} mode. Host: ${redacted.split('@')[1]?.split('/')[0]}`);
    
    // Initialize Postgres Table & Migrations
    const initDb = async () => {
      if (dbMode !== 'postgres') return;
      try {
        console.log("Checking PostgreSQL connection...");
        await query("SELECT 1");
        console.log("PostgreSQL connection verified.");
        
        await query(`
          CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            tracking_code TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            status TEXT NOT NULL,
            last_updated TEXT NOT NULL,
            comment TEXT,
            address TEXT,
            phone TEXT,
            license_category TEXT,
            photo_url TEXT,
            id_card_url TEXT
          );
        `);
        
        console.log("PostgreSQL Table 'applications' verified/created.");

        // Double check columns in case of partial creation
        const columnsToEnsure = ['address', 'phone', 'license_category', 'photo_url', 'id_card_url'];
        for (const col of columnsToEnsure) {
          try {
            await query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS ${col} TEXT;`);
          } catch (e) {
            // Silently ignore if IF NOT EXISTS isn't supported or fails for other reasons
          }
        }
        
        console.log("PostgreSQL Database & Migrations Ready");
      } catch (err: any) {
        const isTransient = err.message.includes("terminated") || err.message.includes("closed") || err.message.includes("ECONNRESET");
        if (isTransient) {
          console.warn("PostgreSQL transient error during init (will retry):", err.message);
        } else {
          console.error("PostgreSQL initialization error (will retry on next request):", err);
        }
      }
    };
    initDb();
  } catch (err) {
    console.error("Failed to initialize PostgreSQL pool:", err);
    dbMode = 'sqlite';
  }
}

if (dbMode === 'sqlite') {
  if (connectionString?.startsWith("https://")) {
    console.error("!!! FATAL ERROR: DATABASE_URL is a REST API URL (starting with https://).");
    console.error("!!! For Supabase, you need the PostgreSQL Connection String (URI).");
  }
  console.log("--- MODE: Using SQLite ---");
  const dbPath = process.env.DATABASE_PATH || "permis.db";
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_code TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      status TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      comment TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tracking_code_sqlite ON applications(tracking_code);
  `);
  
  // SQLite Migrations
  const columns = ['address', 'phone', 'license_category', 'photo_url', 'id_card_url'];
  for (const col of columns) {
    try {
      db.exec(`ALTER TABLE applications ADD COLUMN ${col} TEXT;`);
    } catch (e) {
      // Column probably already exists
    }
  }
}

// ... existing code ...

const isPostgres = dbMode === 'postgres';

const app = express();
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API ROUTES ---

// Public: Get application by tracking code
app.get("/api/track/:code", async (req, res) => {
  const { code } = req.params;
  try {
    let application;
    if (isPostgres) {
      try {
        const result = await query("SELECT * FROM applications WHERE tracking_code = $1", [code]);
        application = result?.rows[0];
      } catch (dbErr) {
        console.error("Postgres Tracking Query Error:", dbErr);
        throw dbErr;
      }
    } else {
      try {
        application = db.prepare("SELECT * FROM applications WHERE tracking_code = ?").get(code);
      } catch (dbErr) {
        console.error("SQLite Tracking Query Error:", dbErr);
        throw dbErr;
      }
    }

    if (!application) {
      return res.status(404).json({ error: "Dossier non trouvé" });
    }
    // Ensure users always get the latest data by disabling caching for this endpoint
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(application);
  } catch (err) {
    console.error("Tracking API error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Admin: Login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  const u = String(username || "").trim();
  const p = String(password || "").trim();

  if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
    console.log(`Admin login successful for user: ${u}`);
    const token = jwt.sign({ username: u }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({ token });
  }
  console.warn(`Admin login failed for user: ${u}. Check ADMIN_USERNAME and ADMIN_PASSWORD env vars.`);
  res.status(401).json({ error: "Identifiants invalides." });
});

// Admin: Get system status
app.get("/api/admin/status", authenticateToken, async (req, res) => {
  let dbConnected = false;
  let dbError = null;
  if (isPostgres) {
    try {
      if (!db) throw new Error("Pool de connexion non initialisé");
      await query("SELECT 1");
      dbConnected = true;
    } catch (e: any) {
      dbConnected = false;
      dbError = e.message;
      
      const connStr = (connectionString || "").trim();
      const isRenderHost = connStr.includes("render.com") || connStr.includes("dpg-");
      const hasDashA = connStr.includes("-a.") || connStr.includes("-a:") || connStr.includes("-a-") || connStr.endsWith("-a");
      
      // Nettoyage des erreurs pour Render
      if (connStr.includes("[YOUR-PASSWORD]")) {
        dbError = "MOT DE PASSE MANQUANT : Remplacez '[YOUR-PASSWORD]' par votre vrai mot de passe dans les Settings.";
      } else if (isRenderHost && (hasDashA || e.message.includes("ENOTFOUND"))) {
        dbError = "ERREUR RENDER : Votre lien contient '-a'. C'est le lien 'Internal'. Allez sur Render -> Connect -> onglet de DROITE 'External Connection' et copiez LE LIEN SANS '-a'.";
      } else if (e.message.includes("password authentication failed")) {
        dbError = "MOT DE PASSE INCORRECT : Le mot de passe dans votre URL Render est invalide.";
      } else if (e.message.includes("ENOTFOUND") || e.message.includes("ETIMEDOUT") || e.message.includes("ECONNREFUSED")) {
        dbError = "SERVEUR INACCESSIBLE : Assurez-vous d'utiliser le lien de l'onglet 'External Connection' sur Render.";
      } else {
        dbError = e.message;
      }
      
      console.error("Status Check - DB Error:", e.message);
    }
  } else {
    dbConnected = true; 
  }

  const resolvedHost = isPostgres ? (connectionString || "").replace(/-a(?=\.|\:|\/|$)/g, "").split('@')[1]?.split('/')[0] : null;

  res.json({
    database: isPostgres ? "Point d'accès PostgreSQL" : "Stockage SQLite (Local)",
    mode: process.env.NODE_ENV || "development",
    isPostgres,
    dbConnected,
    dbError: dbConnected ? null : dbError,
    resolvedHost
  });
});

// Admin: Get all applications (Optimized: No heavy images in list)
app.get("/api/admin/applications", authenticateToken, async (req, res) => {
  try {
    let applications;
    const queryStr = "SELECT id, tracking_code, first_name, last_name, status, last_updated, comment, phone, address, license_category FROM applications ORDER BY last_updated DESC";
    if (isPostgres) {
      const result = await query(queryStr);
      applications = result?.rows;
    } else {
      applications = db.prepare(queryStr).all();
    }
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Admin: Get single application (Full details including images)
app.get("/api/admin/applications/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    let application;
    if (isPostgres) {
      const result = await query("SELECT * FROM applications WHERE id = $1", [id]);
      application = result?.rows[0];
    } else {
      application = db.prepare("SELECT * FROM applications WHERE id = ?").get(id);
    }
    if (!application) return res.status(404).json({ error: "Dossier non trouvé" });
    res.json(application);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

    // Admin: Create application
app.post("/api/admin/applications", authenticateToken, async (req, res) => {
  const { tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, comment } = req.body;
  const last_updated = new Date().toISOString();

  try {
    if (isPostgres) {
      if (!db) throw new Error("La base de données n'est pas initialisée.");
      const result = await query(
        "INSERT INTO applications (tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
        [tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment]
      );
      res.status(201).json({ id: result?.rows[0].id });
    } else {
      const stmt = db.prepare("INSERT INTO applications (tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const result = stmt.run(tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment);
      res.status(201).json({ id: result.lastInsertRowid });
    }
  } catch (error: any) {
    console.error("CRITICAL ERROR DURING CREATION:", error);
    if (error.message.includes("unique") || error.code === "23505") {
      return res.status(400).json({ error: "Ce code de suivi existe déjà" });
    }
    
    const connStr = (connectionString || "").trim();
    const isInternal = connStr.includes("-a.") || connStr.includes("-a:") || connStr.includes("-a-");
    const isEnotFound = error.message.includes("ENOTFOUND") || error.message.includes("ETIMEDOUT");
    const isTerminated = error.message.includes("Connection terminated unexpectedly");
    
    if (isPostgres && (isInternal || (isEnotFound && connStr.includes("render.com")))) {
      return res.status(500).json({ 
        error: "ERREUR RENDER : Votre lien contient '-a' ou est inaccessible. Utilisez UNIQUEMENT le lien de l'onglet 'EXTERNAL CONNECTION' (celui qui n'a pas de '-a')." 
      });
    }

    if (isPostgres && isTerminated) {
      return res.status(500).json({
        error: "CONNEXION COUPÉE : Render a rejeté la connexion. Vérifiez que vous avez copié le lien 'External Connection' COMPLET et réessayez dans 10 secondes."
      });
    }

    if (error.message.includes("relation \"applications\" does not exist")) {
      try {
        if (db && isPostgres) {
          await query("CREATE TABLE IF NOT EXISTS applications (id SERIAL PRIMARY KEY, tracking_code TEXT UNIQUE NOT NULL, first_name TEXT, last_name TEXT, status TEXT NOT NULL, last_updated TEXT NOT NULL, comment TEXT, address TEXT, phone TEXT, license_category TEXT, photo_url TEXT, id_card_url TEXT)");
          return res.status(500).json({ error: "Table créée. Veuillez cliquer à nouveau sur 'Enregistrer'." });
        }
      } catch (e) {}
      return res.status(500).json({ error: "Table manquante sur votre base Render." });
    }
    res.status(500).json({ error: `Erreur base : ${error.message}` });
  }
});

// Admin: Update application
app.put("/api/admin/applications/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, comment, last_updated } = req.body;
  const final_last_updated = last_updated || new Date().toISOString();

  try {
    let result;
    if (isPostgres) {
      result = await query(
        "UPDATE applications SET tracking_code = $1, first_name = $2, last_name = $3, address = $4, phone = $5, license_category = $6, photo_url = $7, id_card_url = $8, status = $9, last_updated = $10, comment = $11 WHERE id = $12",
        [tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, final_last_updated, comment, id]
      );
      if (!result || result.rowCount === 0) return res.status(404).json({ error: "Dossier non trouvé" });
    } else {
      const stmt = db.prepare("UPDATE applications SET tracking_code = ?, first_name = ?, last_name = ?, address = ?, phone = ?, license_category = ?, photo_url = ?, id_card_url = ?, status = ?, last_updated = ?, comment = ? WHERE id = ?");
      const resStmt = stmt.run(tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, final_last_updated, comment, id);
      if (resStmt.changes === 0) return res.status(404).json({ error: "Dossier non trouvé" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

// Admin: Delete application
app.delete("/api/admin/applications/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    let result;
    if (isPostgres) {
      result = await query("DELETE FROM applications WHERE id = $1", [id]);
      if (!result || result.rowCount === 0) return res.status(404).json({ error: "Dossier non trouvé" });
    } else {
      const stmt = db.prepare("DELETE FROM applications WHERE id = ?");
      const resStmt = stmt.run(id);
      if (resStmt.changes === 0) return res.status(404).json({ error: "Dossier non trouvé" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files with cache control
    // We exclude index.html from aggressive caching to ensure app updates are seen
    app.use(express.static(path.join(__dirname, "dist"), {
      maxAge: '1y',
      immutable: true,
      index: false // Don't serve index.html automatically from here
    }));

    app.get("*", (req, res) => {
      // Force no-cache for the entry point index.html
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Keep-Alive: Ping itself every 10 minutes if APP_URL is set
    const appUrl = process.env.APP_URL;
    if (appUrl) {
      console.log(`Keep-Alive active: Pinging ${appUrl} every 10 minutes`);
      setInterval(() => {
        fetch(appUrl).catch(() => {});
      }, 10 * 60 * 1000);
    }
  });
}

startServer();
