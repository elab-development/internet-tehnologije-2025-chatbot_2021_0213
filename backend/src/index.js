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
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
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

app.post("/api/auth/register", authLimiter, (req, res) => {
  const schema = z.object({ username: z.string().min(3), password: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Greska" });

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

app.post("/api/auth/logout", requireAuth, (_req, res) => res.json({ ok: true }));

app.get("/api/auth/me", requireAuth, (req, res) =>
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role })
);

// ── Categories (public) ───────────────────────────────────────────────────────
app.get("/api/categories", (_req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY name").all());
});

// ── QA CRUD ───────────────────────────────────────────────────────────────────

// GET – admin & editor
app.get("/api/qa", requireAuth, requireRole("admin", "editor"), (_req, res) => {
  const rows = db.prepare(`
    SELECT q.*, c.name AS category_name
    FROM qa q
    LEFT JOIN categories c ON c.id = q.category_id
    ORDER BY q.id DESC
  `).all();
  res.json(rows);
});

// POST – admin & editor
app.post("/api/qa", requireAuth, requireRole("admin", "editor"), (req, res) => {
  const schema = z.object({
    question:    z.string().min(3),
    answer:      z.string().min(1),
    keywords:    z.union([z.string(), z.array(z.string()), z.null()]).optional().default(""),
    category_id: z.number().int().optional().nullable()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Greska", details: parsed.error.issues });

  const { question, answer, keywords, category_id } = parsed.data;
  const normalizedKw = Array.isArray(keywords) ? keywords.join(", ") : (keywords ?? "");
  const now = new Date().toISOString();

  const info = db.prepare(
    "INSERT INTO qa (question, answer, keywords, category_id, created_at, updated_at) VALUES (?,?,?,?,?,?)"
  ).run(question, answer, normalizedKw, category_id ?? null, now, now);

  res.status(201).json({ id: info.lastInsertRowid });
});

// PUT – admin & editor
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

// DELETE – admin only
app.delete("/api/qa/:id", requireAuth, requireRole("admin"), (req, res) => {
  const id = Number(req.params.id);
  
  // Prvo obriši povezane chat logove
  db.prepare("UPDATE chat_logs SET matched_qa = NULL WHERE matched_qa = ?").run(id);
  
  const info = db.prepare("DELETE FROM qa WHERE id=?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// ── Chat ──────────────────────────────────────────────────────────────────────

app.post("/api/chat", chatLimiter, (req, res) => {
  const schema = z.object({ message: z.string().min(1).max(500) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Greska" });

  const rows   = db.prepare("SELECT id, question, answer, keywords FROM qa WHERE is_active = 1 OR is_active IS NULL").all();
  const result = pickBestAnswer(parsed.data.message, rows);

  db.prepare("INSERT INTO chat_logs (user_id, message, response, matched_qa, created_at) VALUES (?,?,?,?,?)")
    .run(req.user?.id || null, parsed.data.message, result.answer, result.matched?.id || null, new Date().toISOString());

  res.json({ answer: result.answer, matched: result.matched, suggestions: result.suggestions });
});

// GET /api/chat/stats – admin only
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
