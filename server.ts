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
  let retries = 5; 
  let delay = 1000; 
  let lastError = null;

  while (retries >= 0) {
    try {
      return await db.query(text, params);
    } catch (err: any) {
      lastError = err;
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
        console.warn(`[DB-RETRY] ${msg} - Tentative restante: ${retries} (attente ${delay}ms)`);
        retries--;
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, 7000); 
        continue;
      }
      
      console.error(`[DB-FATAL] ${msg}`);
      throw err;
    }
  }
  throw lastError;
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
      // if (hostPart && !hostPart.includes(".render.com")) {
      // console.warn("!!! AUTO-FIX: Missing domain in Render URL. Appending .frankfurt-postgres.render.com...");
      // trimmedConn = trimmedConn.replace(/(@dpg-[^/:]+)/, "$1.frankfurt-postgres.render.com");
     // }
    }

    db = new Pool({
      connectionString: trimmedConn,
      ssl: { rejectUnauthorized: false },
      max: 4, // Un peu plus de connexions pour absorber les échecs
      idleTimeoutMillis: 30000, // Garder les connexions un peu plus longtemps
      connectionTimeoutMillis: 10000, // Ne pas attendre trop longtemps une nouvelle connexion
      query_timeout: 45000, // Timeout raisonnable
      keepAlive: true,
      keepAliveInitialDelayMillis: 15000 // Keep-alive plus fréquent
    });

    db.on('error', (err: any) => {
      const msg = err.message || "";
      if (msg.includes("terminated unexpectedly") || msg.includes("is closed")) {
        console.warn('PostgreSQL: Une connexion inactive a été fermée par le serveur distant (Render).');
      } else {
        console.error('Erreur PostgreSQL inattendue sur un client inactif:', msg);
      }
    });

    // Keep-alive simple pour éviter la mise en veille
    setInterval(async () => {
      if (dbMode === 'postgres') {
        try {
          await db.query('SELECT 1');
        } catch (e) {
          // Erreur ignorée ici car le pool gère ses clients
        }
      }
    }, 40000);

    dbMode = 'postgres';
    
    // Redact password for logging
    const redacted = trimmedConn.replace(/:([^:@]+)@/, ":****@");
    console.log(`Database initialized in ${dbMode} mode. Host: ${redacted.split('@')[1]?.split('/')[0]}`);
    
    // Initialize Postgres Table & Migrations
    const initDb = async (attempt = 1) => {
      if (dbMode !== 'postgres') return;
      try {
        console.log(`[INIT] Checking PostgreSQL connection (Attempt ${attempt})...`);
        await query("SELECT 1");
        console.log("[INIT] PostgreSQL connection verified.");
        
        await query(`
          CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            tracking_code TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            status TEXT NOT NULL DEFAULT 'Dossier reçu',
            last_updated TEXT NOT NULL,
            comment TEXT,
            address TEXT,
            phone TEXT,
            license_category TEXT,
            photo_url TEXT,
            id_card_url TEXT
          );
        `);
        
        console.log("[INIT] PostgreSQL Table 'applications' verified/created.");

        // Double check all columns for safety
        const columnsToEnsure = [
          { name: 'address', type: 'TEXT' },
          { name: 'phone', type: 'TEXT' },
          { name: 'license_category', type: 'TEXT' },
          { name: 'photo_url', type: 'TEXT' },
          { name: 'id_card_url', type: 'TEXT' },
          { name: 'first_name', type: 'TEXT' },
          { name: 'last_name', type: 'TEXT' },
          { name: 'status', type: 'TEXT' },
          { name: 'comment', type: 'TEXT' }
        ];

        for (const col of columnsToEnsure) {
          try {
            await query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
          } catch (e: any) {
            // Probably already exists, that's fine
          }
        }
        
        console.log("[INIT] PostgreSQL Database & Migrations Ready");
      } catch (err: any) {
        const isTransient = err.message.includes("terminated") || err.message.includes("closed") || err.message.includes("ECONNRESET");
        if (isTransient && attempt < 3) {
          const wait = attempt * 3000;
          console.warn(`[INIT] PostgreSQL transient error, retrying in ${wait}ms...`, err.message);
          setTimeout(() => initDb(attempt + 1), wait);
        } else if (isTransient) {
          console.error("[INIT] PostgreSQL transient error after 3 attempts. Will wait for client activity.", err.message);
        } else {
          console.error("[INIT] PostgreSQL initialization error:", err);
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
      status TEXT NOT NULL DEFAULT 'Dossier reçu',
      last_updated TEXT NOT NULL,
      comment TEXT,
      address TEXT,
      phone TEXT,
      license_category TEXT,
      photo_url TEXT,
      id_card_url TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tracking_code_sqlite ON applications(tracking_code);
  `);
  
  // SQLite Migrations for existing DBs
  const columns = ['address', 'phone', 'license_category', 'photo_url', 'id_card_url', 'comment', 'first_name', 'last_name'];
  for (const col of columns) {
    try {
      db.exec(`ALTER TABLE applications ADD COLUMN ${col} TEXT;`);
    } catch (e) {
      // Column probably already exists
    }
  }
}

const getIsPostgres = () => dbMode === 'postgres';

const app = express();
app.use(compression());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Authentification requise" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Session expirée ou invalide" });
    req.user = user;
    next();
  });
};

// --- API ROUTES ---

// Public: Get application by tracking code
app.get("/api/track/:code", async (req, res) => {
  const { code } = req.params;
  const isPostgres = getIsPostgres();
  try {
    let application;
    if (isPostgres) {
      const result = await query("SELECT * FROM applications WHERE tracking_code = $1", [code]);
      application = result?.rows[0];
    } else {
      application = db.prepare("SELECT * FROM applications WHERE tracking_code = ?").get(code);
    }

    if (!application) {
      return res.status(404).json({ error: "Dossier non trouvé" });
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json(application);
  } catch (err) {
    console.error("Tracking API error:", err);
    res.status(500).json({ error: "Erreur serveur de base de données" });
  }
});

// Admin: Login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  const u = String(username || "").trim();
  const p = String(password || "").trim();

  if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
    const token = jwt.sign({ username: u }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({ token });
  }
  res.status(401).json({ error: "Identifiants invalides." });
});

// Admin: Get system status
app.get("/api/admin/status", authenticateToken, async (req, res) => {
  const isPostgres = getIsPostgres();
  let dbConnected = false;
  let dbError = null;
  if (isPostgres) {
    try {
      if (!db) throw new Error("Pool de connexion non initialisé");
      await query("SELECT 1");
      dbConnected = true;
    } catch (e: any) {
      dbConnected = false;
      const connStr = (connectionString || "").trim();
      if (connStr.includes("[YOUR-PASSWORD]")) {
        dbError = "MOT DE PASSE MANQUANT : Remplacez '[YOUR-PASSWORD]' par votre vrai mot de passe.";
      } else if (e.message.includes("password authentication failed")) {
        dbError = "MOT DE PASSE INCORRECT.";
      } else {
        dbError = e.message;
      }
    }
  } else {
    dbConnected = true; 
  }

  const resolvedHost = isPostgres ? (connectionString || "").replace(/-a(?=\.|\:|\/|$)/g, "").split('@')[1]?.split('/')[0] : null;

  res.json({
    database: isPostgres ? "PostgreSQL (Render/Supabase)" : "SQLite (Local)",
    isPostgres,
    dbConnected,
    dbError,
    resolvedHost
  });
});

// Admin: Get all applications
app.get("/api/admin/applications", authenticateToken, async (req, res) => {
  const isPostgres = getIsPostgres();
  try {
    let applications;
    const queryStr = "SELECT id, tracking_code, first_name, last_name, status, last_updated, phone FROM applications ORDER BY last_updated DESC";
    if (isPostgres) {
      const result = await query(queryStr);
      applications = result?.rows;
    } else {
      applications = db.prepare(queryStr).all();
    }
    res.json(applications || []);
  } catch (err: any) {
    console.error("Admin fetch apps error:", err.message);
    res.status(500).json({ error: "Erreur lors du chargement des dossiers" });
  }
});

// Admin: Get single application
app.get("/api/admin/applications/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const isPostgres = getIsPostgres();
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
  } catch (err: any) {
    res.status(500).json({ error: "Erreur lors de la récupération du dossier" });
  }
});

// Admin: Create application
app.post("/api/admin/applications", authenticateToken, async (req, res) => {
  const isPostgres = getIsPostgres();
  const { tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, comment } = req.body;
  const last_updated = new Date().toISOString();
  const finalStatus = status || "Dossier reçu";
  
  if (!tracking_code || !String(tracking_code).trim()) {
    return res.status(400).json({ error: "Le code de suivi est obligatoire." });
  }

  const trimmedCode = String(tracking_code).trim();
  console.log(`[DB] Create request for: ${trimmedCode}`);

  try {
    if (isPostgres) {
      const result = await query(
        "INSERT INTO applications (tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
        [trimmedCode, first_name || null, last_name || null, address || null, phone || null, license_category || null, photo_url || null, id_card_url || null, finalStatus, last_updated, comment || null]
      );
      res.status(201).json({ id: result.rows[0].id });
    } else {
      const stmt = db.prepare("INSERT INTO applications (tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const result = stmt.run(trimmedCode, first_name || null, last_name || null, address || null, phone || null, license_category || null, photo_url || null, id_card_url || null, finalStatus, last_updated, comment || null);
      res.status(201).json({ id: result.lastInsertRowid });
    }
  } catch (error: any) {
    console.error("[DB-CREATE] Error:", error.message);
    if (error.message.includes("unique") || error.code === "23505" || error.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Ce code de suivi existe déjà." });
    }
    res.status(500).json({ error: `Erreur base : ${error.message}` });
  }
});

// Admin: Update application
app.put("/api/admin/applications/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const isPostgres = getIsPostgres();
  const { tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, comment } = req.body;
  const last_updated = new Date().toISOString();

  try {
    if (isPostgres) {
      const result = await query(
        "UPDATE applications SET tracking_code = $1, first_name = $2, last_name = $3, address = $4, phone = $5, license_category = $6, photo_url = $7, id_card_url = $8, status = $9, last_updated = $10, comment = $11 WHERE id = $12",
        [tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment, id]
      );
      if (!result || result.rowCount === 0) return res.status(404).json({ error: "Dossier non trouvé" });
    } else {
      const stmt = db.prepare("UPDATE applications SET tracking_code = ?, first_name = ?, last_name = ?, address = ?, phone = ?, license_category = ?, photo_url = ?, id_card_url = ?, status = ?, last_updated = ?, comment = ? WHERE id = ?");
      const resStmt = stmt.run(tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment, id);
      if (resStmt.changes === 0) return res.status(404).json({ error: "Dossier non trouvé" });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DB-UPDATE] Error:", error.message);
    res.status(500).json({ error: "Erreur lors de la mise à jour : " + error.message });
  }
});

// Admin: Delete application
app.delete("/api/admin/applications/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const isPostgres = getIsPostgres();
  try {
    if (isPostgres) {
      const result = await query("DELETE FROM applications WHERE id = $1", [id]);
      if (!result || result.rowCount === 0) return res.status(404).json({ error: "Dossier non trouvé" });
    } else {
      const stmt = db.prepare("DELETE FROM applications WHERE id = ?");
      const resStmt = stmt.run(id);
      if (resStmt.changes === 0) return res.status(404).json({ error: "Dossier non trouvé" });
    }
    res.json({ success: true });
  } catch (err: any) {
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
