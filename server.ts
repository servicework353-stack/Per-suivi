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

// --- DATABASE ABSTRACTION ---
let db: any;
const isPostgres = !!process.env.DATABASE_URL;

if (isPostgres) {
  console.log("--- PRODUCTION MODE: Using PostgreSQL ---");
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  // Initialize Postgres Table & Migrations
  const initDb = async () => {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS applications (
          id SERIAL PRIMARY KEY,
          tracking_code TEXT UNIQUE NOT NULL,
          first_name TEXT,
          last_name TEXT,
          status TEXT NOT NULL,
          last_updated TEXT NOT NULL,
          comment TEXT,
          history TEXT
        );
      `);

      // Add new columns if they don't exist
      const columns = ['address', 'phone', 'license_category', 'photo_url', 'id_card_url', 'history'];
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
} else {
  console.log("--- DEMO MODE: Using SQLite (Data will be lost on restart) ---");
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
  `);
  
  // SQLite Migrations
  const columns = ['address', 'phone', 'license_category', 'photo_url', 'id_card_url', 'history'];
  for (const col of columns) {
    try {
      db.exec(`ALTER TABLE applications ADD COLUMN ${col} TEXT;`);
    } catch (e) {
      // Column probably already exists
    }
  }
}

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
      const result = await db.query("SELECT * FROM applications WHERE tracking_code = $1", [code]);
      application = result.rows[0];
    } else {
      application = db.prepare("SELECT * FROM applications WHERE tracking_code = ?").get(code);
    }

    if (!application) {
      return res.status(404).json({ error: "Dossier non trouvé" });
    }
    if (application.history) {
      try {
        application.history = JSON.parse(application.history);
      } catch (e) {
        application.history = [];
      }
    }
    // Cache for 1 minute to reduce DB load on frequent refreshes
    res.set('Cache-Control', 'public, max-age=60');
    res.json(application);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
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
app.get("/api/admin/status", authenticateToken, (req, res) => {
  res.json({
    database: isPostgres ? "PostgreSQL (Permanent)" : "SQLite (Temporaire - Données perdues au redémarrage)",
    mode: process.env.NODE_ENV || "development",
    isPostgres
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
  const history = JSON.stringify([{ status, date: last_updated, comment }]);

  try {
    if (isPostgres) {
      const result = await db.query(
        "INSERT INTO applications (tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment, history) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id",
        [tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment, history]
      );
      res.status(201).json({ id: result.rows[0].id });
    } else {
      const stmt = db.prepare("INSERT INTO applications (tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment, history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      const result = stmt.run(tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, last_updated, comment, history);
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
    // Get current application to check for status change
    let currentApp;
    if (isPostgres) {
      const result = await db.query("SELECT * FROM applications WHERE id = $1", [id]);
      currentApp = result.rows[0];
    } else {
      currentApp = db.prepare("SELECT * FROM applications WHERE id = ?").get(id);
    }

    if (!currentApp) return res.status(404).json({ error: "Dossier non trouvé" });

    // Update history if status changed or comment changed
    let history = [];
    try {
      history = JSON.parse(currentApp.history || '[]');
    } catch (e) {
      history = [];
    }

    if (currentApp.status !== status || currentApp.comment !== comment) {
      history.push({ status, date: final_last_updated, comment });
    }
    const finalHistory = JSON.stringify(history);

    if (isPostgres) {
      await db.query(
        "UPDATE applications SET tracking_code = $1, first_name = $2, last_name = $3, address = $4, phone = $5, license_category = $6, photo_url = $7, id_card_url = $8, status = $9, last_updated = $10, comment = $11, history = $12 WHERE id = $13",
        [tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, final_last_updated, comment, finalHistory, id]
      );
    } else {
      const stmt = db.prepare("UPDATE applications SET tracking_code = ?, first_name = ?, last_name = ?, address = ?, phone = ?, license_category = ?, photo_url = ?, id_card_url = ?, status = ?, last_updated = ?, comment = ?, history = ? WHERE id = ?");
      stmt.run(tracking_code, first_name, last_name, address, phone, license_category, photo_url, id_card_url, status, final_last_updated, comment, finalHistory, id);
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Update error:", error);
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
    // Cache static assets for 1 year
    app.use(express.static(path.join(__dirname, "dist"), {
      maxAge: '1y',
      immutable: true
    }));
    app.get("*", (req, res) => {
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
