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
    ssl: { rejectUnauthorized: false }
  });
  
  // Initialize Postgres Table
  db.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      tracking_code TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      status TEXT NOT NULL,
      last_updated TEXT NOT NULL,
      comment TEXT
    );
  `).then(() => console.log("PostgreSQL Table Ready")).catch(console.error);
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
}

const app = express();
app.use(compression());
app.use(express.json());

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

// Admin: Get all applications
app.get("/api/admin/applications", authenticateToken, async (req, res) => {
  try {
    let applications;
    if (isPostgres) {
      const result = await db.query("SELECT * FROM applications ORDER BY last_updated DESC");
      applications = result.rows;
    } else {
      applications = db.prepare("SELECT * FROM applications ORDER BY last_updated DESC").all();
    }
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Admin: Create application
app.post("/api/admin/applications", authenticateToken, async (req, res) => {
  const { tracking_code, first_name, last_name, status, comment } = req.body;
  const last_updated = new Date().toISOString();

  try {
    if (isPostgres) {
      const result = await db.query(
        "INSERT INTO applications (tracking_code, first_name, last_name, status, last_updated, comment) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [tracking_code, first_name, last_name, status, last_updated, comment]
      );
      res.status(201).json({ id: result.rows[0].id });
    } else {
      const stmt = db.prepare("INSERT INTO applications (tracking_code, first_name, last_name, status, last_updated, comment) VALUES (?, ?, ?, ?, ?, ?)");
      const result = stmt.run(tracking_code, first_name, last_name, status, last_updated, comment);
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
  const { tracking_code, first_name, last_name, status, comment, last_updated } = req.body;
  const final_last_updated = last_updated || new Date().toISOString();

  try {
    let result;
    if (isPostgres) {
      result = await db.query(
        "UPDATE applications SET tracking_code = $1, first_name = $2, last_name = $3, status = $4, last_updated = $5, comment = $6 WHERE id = $7",
        [tracking_code, first_name, last_name, status, final_last_updated, comment, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Dossier non trouvé" });
    } else {
      const stmt = db.prepare("UPDATE applications SET tracking_code = ?, first_name = ?, last_name = ?, status = ?, last_updated = ?, comment = ? WHERE id = ?");
      const resStmt = stmt.run(tracking_code, first_name, last_name, status, final_last_updated, comment, id);
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
  const PORT = process.env.PORT || 3000;

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
