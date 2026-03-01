import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("permis.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync("admin123", 10);

// Initialize Database
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

const app = express();
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
app.get("/api/track/:code", (req, res) => {
  const { code } = req.params;
  const stmt = db.prepare("SELECT * FROM applications WHERE tracking_code = ?");
  const application = stmt.get(code);

  if (!application) {
    return res.status(404).json({ error: "Dossier non trouvé" });
  }

  res.json(application);
});

// Admin: Login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  
  // Normalize inputs: trim and lowercase username
  const u = String(username || "").trim().toLowerCase();
  const p = String(password || "").trim();

  // 1. Direct check for default credentials (highest priority for ease of use)
  const isDefault = (u === "admin" && p === "admin123");
  
  // 2. Check against environment hash if provided
  let isHashed = false;
  if (u === "admin" && process.env.ADMIN_PASSWORD_HASH) {
    try {
      isHashed = bcrypt.compareSync(p, process.env.ADMIN_PASSWORD_HASH);
    } catch (e) {
      console.error("Bcrypt comparison failed:", e);
    }
  }

  if (isDefault || isHashed) {
    const token = jwt.sign({ username: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({ token });
  }

  res.status(401).json({ error: "Identifiants invalides. Utilisez 'admin' et 'admin123'." });
});

// Admin: Get all applications
app.get("/api/admin/applications", authenticateToken, (req, res) => {
  const stmt = db.prepare("SELECT * FROM applications ORDER BY last_updated DESC");
  const applications = stmt.all();
  res.json(applications);
});

// Admin: Create application
app.post("/api/admin/applications", authenticateToken, (req, res) => {
  const { tracking_code, first_name, last_name, status, comment } = req.body;
  const last_updated = new Date().toISOString();

  try {
    const stmt = db.prepare(`
      INSERT INTO applications (tracking_code, first_name, last_name, status, last_updated, comment)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(tracking_code, first_name, last_name, status, last_updated, comment);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error: any) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Ce code de suivi existe déjà" });
    }
    res.status(500).json({ error: "Erreur lors de la création" });
  }
});

// Admin: Update application
app.put("/api/admin/applications/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { tracking_code, first_name, last_name, status, comment, last_updated } = req.body;
  const final_last_updated = last_updated || new Date().toISOString();

  try {
    const stmt = db.prepare(`
      UPDATE applications 
      SET tracking_code = ?, first_name = ?, last_name = ?, status = ?, last_updated = ?, comment = ?
      WHERE id = ?
    `);
    const result = stmt.run(tracking_code, first_name, last_name, status, final_last_updated, comment, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Dossier non trouvé" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

// Admin: Delete application
app.delete("/api/admin/applications/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare("DELETE FROM applications WHERE id = ?");
  const result = stmt.run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Dossier non trouvé" });
  }
  res.json({ success: true });
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
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
