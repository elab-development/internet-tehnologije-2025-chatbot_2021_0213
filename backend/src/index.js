import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import swaggerUi from "swagger-ui-express";

import { db, migrate } from "./db.js";
import { requireAuth, requireRole, SECRET } from "./auth.js";
import { pickBestAnswer } from "./match.js";
import { swaggerSpec } from "./swagger.js";
import {
  globalLimiter,
  authLimiter,
  chatLimiter,
  sanitizeBody,
  securityHeaders,
} from "./middleware/security.js";

migrate();

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",");
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost")) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(securityHeaders);
app.use(globalLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(sanitizeBody);
app.use(morgan("dev"));

// ── Swagger docs ──────────────────────────────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registracija novog korisnika (role=user)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Korisnik uspešno kreiran
 *       400:
 *         description: Greška pri validaciji
 *       409:
 *         description: Korisnik već postoji
 */
app.post("/api/auth/register", authLimiter, (req, res) => {
  const schema = z.object({ username: z.string().min(3), password: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Korisničko ime min 3 znaka, lozinka min 6 znakova." });

  const { username, password } = parsed.data;
  if (db.prepare("SELECT id FROM users WHERE username=?").get(username)) {
    return res.status(409).json({ error: "User already exists" });
  }

  const userRoleId = db.prepare("SELECT id FROM roles WHERE name='user'").get()?.id;
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (username, password_hash, created_at, role_id) VALUES (?,?,?,?)")
    .run(username, hash, new Date().toISOString(), userRoleId);

  res.status(201).json({ ok: true });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Prijava korisnika (sve uloge)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Uspešna prijava, vraća JWT token i podatke o korisniku
 *       401:
 *         description: Pogrešni kredencijali
 */
app.post("/api/auth/login", authLimiter, (req, res) => {
  const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Greška pri validaciji podataka" });

  const { username, password } = parsed.data;
  const user = db.prepare(`
    SELECT u.id, u.username, u.password_hash, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.username = ?
  `).get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Bad credentials" });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Odjava korisnika
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Uspešna odjava
 */
app.post("/api/auth/logout", requireAuth, (_req, res) => res.json({ ok: true }));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Podaci o trenutno prijavljenom korisniku
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Podaci o korisniku (id, username, role)
 */
app.get("/api/auth/me", requireAuth, (req, res) =>
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role })
);

// ── Users (admin only) ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista svih korisnika (samo admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista korisnika
 */
app.get("/api/users", requireAuth, requireRole("admin"), (_req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.created_at, u.email, u.is_active, r.name AS role
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ORDER BY u.id DESC
  `).all();
  res.json(users);
});

/**
 * @swagger
 * /api/users/{id}/role:
 *   put:
 *     summary: Promena uloge korisnika (samo admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, editor, user]
 *     responses:
 *       200:
 *         description: Uloga uspešno promenjena
 *       404:
 *         description: Korisnik nije pronađen
 */
app.put("/api/users/:id/role", requireAuth, requireRole("admin"), (req, res) => {
  const schema = z.object({ role: z.enum(["admin", "editor", "user"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Nevažeća uloga" });

  const roleRow = db.prepare("SELECT id FROM roles WHERE name=?").get(parsed.data.role);
  if (!roleRow) return res.status(400).json({ error: "Uloga ne postoji" });

  const info = db.prepare("UPDATE users SET role_id=? WHERE id=?").run(roleRow.id, Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: "Korisnik nije pronađen" });
  res.json({ ok: true });
});

// ── Categories (public) ───────────────────────────────────────────────────────

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Lista svih kategorija (javno)
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Lista kategorija
 */
app.get("/api/categories", (_req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY name").all());
});

// ── QA CRUD ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/qa:
 *   get:
 *     summary: Lista svih Q/A pitanja (admin i editor)
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista pitanja i odgovora
 */
app.get("/api/qa", requireAuth, requireRole("admin", "editor"), (_req, res) => {
  const rows = db.prepare(`
    SELECT q.*, c.name AS category_name
    FROM qa q
    LEFT JOIN categories c ON c.id = q.category_id
    ORDER BY q.id DESC
  `).all();
  res.json(rows);
});

/**
 * @swagger
 * /api/qa/{id}:
 *   get:
 *     summary: Jedno pitanje po ID (admin i editor)
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pitanje pronađeno
 *       404:
 *         description: Pitanje nije pronađeno
 */
app.get("/api/qa/:id", requireAuth, requireRole("admin", "editor"), (req, res) => {
  const row = db.prepare(`
    SELECT q.*, c.name AS category_name
    FROM qa q LEFT JOIN categories c ON c.id = q.category_id
    WHERE q.id = ?
  `).get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

/**
 * @swagger
 * /api/qa:
 *   post:
 *     summary: Dodaj novo pitanje (admin i editor)
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 */
app.post("/api/qa", requireAuth, requireRole("admin", "editor"), (req, res) => {
  const schema = z.object({
    question:    z.string().min(3),
    answer:      z.string().min(1),
    keywords:    z.union([z.string(), z.array(z.string()), z.null()]).optional().default(""),
    category_id: z.number().int().optional().nullable()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Greška", details: parsed.error.issues });

  const { question, answer, keywords, category_id } = parsed.data;
  const normalizedKw = Array.isArray(keywords) ? keywords.join(", ") : (keywords ?? "");
  const now = new Date().toISOString();

  const info = db.prepare(
    "INSERT INTO qa (question, answer, keywords, category_id, created_at, updated_at) VALUES (?,?,?,?,?,?)"
  ).run(question, answer, normalizedKw, category_id ?? null, now, now);

  res.status(201).json({ id: info.lastInsertRowid });
});

/**
 * @swagger
 * /api/qa/{id}:
 *   put:
 *     summary: Izmeni pitanje (admin i editor)
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 */
app.put("/api/qa/:id", requireAuth, requireRole("admin", "editor"), (req, res) => {
  const schema = z.object({
    question:    z.string().min(3),
    answer:      z.string().min(1),
    keywords:    z.union([z.string(), z.array(z.string()), z.null()]).optional().default(""),
    category_id: z.number().int().optional().nullable()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Greška pri izmeni pitanja", details: parsed.error.issues });

  const { question, answer, keywords, category_id } = parsed.data;
  const normalizedKw = Array.isArray(keywords) ? keywords.join(", ") : (keywords ?? "");
  const id  = Number(req.params.id);
  const now = new Date().toISOString();

  const info = db.prepare(
    "UPDATE qa SET question=?, answer=?, keywords=?, category_id=?, updated_at=? WHERE id=?"
  ).run(question, answer, normalizedKw, category_id ?? null, now, id);

  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

/**
 * @swagger
 * /api/qa/{id}:
 *   delete:
 *     summary: Obriši pitanje (samo admin)
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 */
app.delete("/api/qa/:id", requireAuth, requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE chat_logs SET matched_qa = NULL WHERE matched_qa = ?").run(id);
  const info = db.prepare("DELETE FROM qa WHERE id=?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ── Chat ──────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Pošalji poruku chatbotu (javno)
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Odgovor chatbota
 */
app.post("/api/chat", chatLimiter, (req, res) => {
  const schema = z.object({ message: z.string().min(1).max(500) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Greška" });

  // Pokušaj autentifikacije (opciono - korisnici ne moraju biti prijavljeni)
  let userId = null;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET);
      userId = payload.sub;
    } catch {}
  }

  const rows   = db.prepare("SELECT id, question, answer, keywords FROM qa WHERE is_active = 1 OR is_active IS NULL").all();
  const result = pickBestAnswer(parsed.data.message, rows);

  db.prepare("INSERT INTO chat_logs (user_id, message, response, matched_qa, created_at) VALUES (?,?,?,?,?)")
    .run(userId, parsed.data.message, result.answer, result.matched?.id || null, new Date().toISOString());

  res.json({ answer: result.answer, matched: result.matched, suggestions: result.suggestions });
});

/**
 * @swagger
 * /api/chat/history:
 *   get:
 *     summary: Istorija razgovora prijavljenog korisnika
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista poruka korisnika
 */
app.get("/api/chat/history", requireAuth, (req, res) => {
  const logs = db.prepare(`
    SELECT id, message, response, created_at
    FROM chat_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);
  res.json(logs);
});

/**
 * @swagger
 * /api/chat/stats:
 *   get:
 *     summary: Statistike chatbota (samo admin)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistike
 */
app.get("/api/chat/stats", requireAuth, requireRole("admin"), (_req, res) => {
  const total   = db.prepare("SELECT COUNT(*) AS cnt FROM chat_logs").get();
  const matched = db.prepare("SELECT COUNT(*) AS cnt FROM chat_logs WHERE matched_qa IS NOT NULL").get();
  const daily   = db.prepare(`
    SELECT DATE(created_at) AS date, COUNT(*) AS count
    FROM chat_logs
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 30
  `).all();
  const topQA = db.prepare(`
    SELECT q.question, COUNT(cl.id) AS times_asked
    FROM chat_logs cl
    JOIN qa q ON q.id = cl.matched_qa
    GROUP BY cl.matched_qa
    ORDER BY times_asked DESC
    LIMIT 10
  `).all();
  const byCategory = db.prepare(`
    SELECT c.name AS category, COUNT(cl.id) AS count
    FROM chat_logs cl
    JOIN qa q  ON q.id  = cl.matched_qa
    JOIN categories c ON c.id = q.category_id
    GROUP BY q.category_id
    ORDER BY count DESC
  `).all();

  res.json({
    total: total.cnt,
    matched: matched.cnt,
    matchRate: total.cnt > 0 ? ((matched.cnt / total.cnt) * 100).toFixed(1) : 0,
    daily,
    topQA,
    byCategory,
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`✅ API listening on http://localhost:${port}`);
  console.log(`📄 Swagger docs: http://localhost:${port}/api/docs`);
});

export default app;
