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

if (connectionString && !connectionString.startsWith("https://")) {
  console.log("--- PRODUCTION MODE: Trying PostgreSQL ---");
  
  // Check for common [YOUR-PASSWORD] mistake
  if (connectionString.includes("[YOUR-PASSWORD]") || connectionString.includes("[PASSWORD]")) {
    console.warn("!!! WARNING: Your DATABASE_URL contains placeholder '[YOUR-PASSWORD]'. Please replace it with your real password in the app settings.");
  }

  try {
    db = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased to 10s for remote DBs
    });
    dbMode = 'postgres';
    
    // Initialize Postgres Table & Migrations
    const initDb = async () => {
      try {
        // Test connection
        const start = Date.now();
        await db.query("SELECT 1");
        console.log(`PostgreSQL connection successful (${Date.now() - start}ms)`);

        await db.query(`
          CREATE TABLE IF NOT EXISTS applications (
            id SERIAL PRIMARY KEY,
            tracking_code TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            status TEXT NOT NULL,
            last_updated TEXT NOT NULL,
            comment TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_tracking_code ON applications(tracking_code);
        `);

        // Add new columns if they don't exist
        const columns = ['address', 'phone', 'license_category', 'photo_url', 'id_card_url'];
        for (const col of columns) {
          await db.query(`
            DO $$ 
            BEGIN 
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='${col}') THEN 
                ALTER TABLE applications ADD COLUMN ${col} TEXT; 
              END IF; 
            END $$;
          `);
        }
        console.log("PostgreSQL Database & Migrations Ready");
      } catch (err) {
        console.error("Database init error:", err);
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
        const result = await db.query("SELECT * FROM applications WHERE tracking_code = $1", [code]);
        application = result.rows[0];
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
      await db.query("SELECT 1");
      dbConnected = true;
    } catch (e: any) {
      dbConnected = false;
      dbError = e.message;
      
      // Add a helpful hint for common mistakes
      if (connectionString?.includes("[YOUR-PASSWORD]") || connectionString?.includes("[PASSWORD]")) {
        dbError = "Veuillez remplacer [YOUR-PASSWORD] par votre mot de passe réel dans les paramètres de l'application.";
      } else if (e.message.includes("password authentication failed")) {
        dbError = "Le mot de passe de la base de données est incorrect.";
      } else if (e.message.includes("ENOTFOUND") || e.message.includes("ETIMEDOUT")) {
        dbError = "Impossible de joindre le serveur Supabase. Vérifiez l'URL de l'hôte.";
      }
      
      console.error("Status Check - DB Error:", e.message);
    }
  } else {
    dbConnected = true; 
  }

  res.json({
    database: isPostgres ? "Point d'accès PostgreSQL" : "Stockage SQLite (Local)",
    mode: process.env.NODE_ENV || "development",
    isPostgres,
    dbConnected,
    dbError: dbConnected ? null : dbError
  });
});

// Admin: Get all applications (Optimized: No heavy images in list)
app.get("/api/admin/applications", authenticateToken, async (req, res) => {
  try {
    let applications;
    const query = "SELECT id, tracking_code, first_name, last_name, status, last_updated, comment, phone, address, license_category FROM applications ORDER BY last_updated DESC";
    if (isPostgres) {
      const result = await db.query(query);
      applications = result.rows;
    } else {
      applications = db.prepare(query).all();
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
      const result = await db.query("SELECT * FROM applications WHERE id = $1", [id]);
      application = result.rows[0];
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
      const result = await db.query(
        "INSERT INTO applications (tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
        [tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment]
      );
      res.status(201).json({ id: result.rows[0].id });
    } else {
      const stmt = db.prepare("INSERT INTO applications (tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const result = stmt.run(tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment);
      res.status(201).json({ id: result.lastInsertRowid });
    }
  } catch (error: any) {
    if (error.message.includes("unique") || error.code === "23505") {
      return res.status(400).json({ error: "Ce code de suivi existe déjà" });
    }
    res.status(500).json({ error: "Erreur lors de la création" });
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
      result = await db.query(
        "UPDATE applications SET tracking_code = $1, first_name = $2, last_name = $3, address = $4, phone = $5, license_category = $6, photo_url = $7, id_card_url = $8, status = $9, last_updated = $10, comment = $11 WHERE id = $12",
        [tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, final_last_updated, comment, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Dossier non trouvé" });
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
      result = await db.query("DELETE FROM applications WHERE id = $1", [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: "Dossier non trouvé" });
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
