import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db, migrate } from "./db.js";
import { requireAuth } from "./auth.js";
import { pickBestAnswer } from "./match.js";

migrate();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- Auth ---
app.post("/api/auth/login", (req, res) => {
  const schema = z.object({
    username: z.string().min(1),
    password: z.string().min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const { username, password } = parsed.data;
  const user = db.prepare("SELECT id, username, password_hash FROM users WHERE username=?").get(username);
  if (!user) return res.status(401).json({ error: "Bad credentials" });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Bad credentials" });

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: "admin" },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "8h" }
  );

  res.json({ token });
});

// --- Public chat endpoint ---
app.post("/api/chat", (req, res) => {
  const schema = z.object({ message: z.string().min(1).max(500) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });

  const rows = db.prepare("SELECT id, question, answer, keywords FROM qa").all();
  const result = pickBestAnswer(parsed.data.message, rows);

  db.prepare(`
  INSERT INTO chat_logs (message, response, created_at)
  VALUES (?,?,?)
`).run(parsed.data.message, result.answer, new Date().toISOString());



  res.json({
    answer: result.answer,
    matched: result.matched,
    suggestions: result.suggestions
  });
});

// --- Admin CRUD for QA ---
app.get("/api/qa", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT id, question, answer, keywords, created_at, updated_at FROM qa ORDER BY id DESC").all();
  res.json(rows);
});



app.post("/api/qa", requireAuth, (req, res) => {
  console.log("REQ.BODY =", req.body);

  const schema = z.object({
    question: z.string().min(3),
    answer: z.string().min(1),
    keywords: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional()
      .default("")
  });

  // 1️⃣ VALIDACIJA
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.issues
    });
  }

  // 2️⃣ SIGURNO UZIMANJE PODATAKA
  const question = parsed.data.question;
  const answer = parsed.data.answer;
  const keywords = parsed.data.keywords;

  // 3️⃣ NORMALIZACIJA KEYWORDS
  const normalizedKeywords = Array.isArray(keywords)
    ? keywords.join(", ")
    : (keywords ?? "");

  // 4️⃣ UPIS U BAZU
  const now = new Date().toISOString();

  try {
    const stmt = db.prepare(
      "INSERT INTO qa (question, answer, keywords, created_at, updated_at) VALUES (?,?,?,?,?)"
    );

    const info = stmt.run(
      question,
      answer,
      normalizedKeywords,
      now,
      now
    );

    // 5️⃣ ODGOVOR
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).json({ error: "Database error" });
  }
});



app.put("/api/qa/:id", requireAuth, (req, res) => {
  const schema = z.object({
    question: z.string().min(3),
    answer: z.string().min(1),
    keywords: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional()
      .default("")
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.issues
    });
  }

  const { question, answer, keywords } = parsed.data;

  const normalizedKeywords = Array.isArray(keywords)
    ? keywords.join(", ")
    : (keywords ?? "");

  const id = Number(req.params.id);
  const now = new Date().toISOString();

  const stmt = db.prepare(
    "UPDATE qa SET question=?, answer=?, keywords=?, updated_at=? WHERE id=?"
  );

  const info = stmt.run(question, answer, normalizedKeywords, now, id);

  if (info.changes === 0) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json({ ok: true });
});


app.delete("/api/qa/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const stmt = db.prepare("DELETE FROM qa WHERE id=?");
  const info = stmt.run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

app.post("/api/auth/register", (req, res) => {
  const schema = z.object({
    username: z.string().min(3),
    password: z.string().min(6)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const { username, password } = parsed.data;

  const exists = db
    .prepare("SELECT id FROM users WHERE username=?")
    .get(username);

  if (exists) {
    return res.status(409).json({ error: "User already exists" });
  }

  const userRoleId = db
    .prepare("SELECT id FROM roles WHERE name='user'")
    .get()?.id;

  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (username, password_hash, created_at, role_id)
    VALUES (?,?,?,?)
  `).run(username, hash, new Date().toISOString(), userRoleId);

  res.status(201).json({ ok: true });
});

app.post("/api/auth/logout", requireAuth, (_req, res) => {
  // JWT je stateless – logout je frontend odgovornost
  res.json({ ok: true });
});
