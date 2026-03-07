// ESM Jest tests – requires node --experimental-vm-modules
import request from "supertest";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB   = path.join(__dirname, "test.db");

process.env.DB_PATH    = TEST_DB;
process.env.JWT_SECRET = "test-secret";
process.env.NODE_ENV   = "test";

// Top-level await is valid in ESM modules
const { db, migrate } = await import("../db.js");
const { default: app } = await import("../index.js");

// ── Setup / Teardown ─────────────────────────────────────────────────────────
beforeAll(() => {
  migrate();
  const hash     = bcrypt.hashSync("testpass", 10);
  const adminId  = db.prepare("SELECT id FROM roles WHERE name='admin'").get()?.id;
  const editorId = db.prepare("SELECT id FROM roles WHERE name='editor'").get()?.id;
  db.prepare("INSERT OR IGNORE INTO users (username, password_hash, created_at, role_id) VALUES (?,?,?,?)")
    .run("testadmin", hash, new Date().toISOString(), adminId);
  db.prepare("INSERT OR IGNORE INTO users (username, password_hash, created_at, role_id) VALUES (?,?,?,?)")
    .run("testeditor", hash, new Date().toISOString(), editorId);
});

afterAll(() => {
  try { db.close(); } catch (_) {}
  try { fs.unlinkSync(TEST_DB); } catch (_) {}
});

// ── Health ────────────────────────────────────────────────────────────────────
describe("GET /api/health", () => {
  test("returns 200", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  test("valid credentials → token + role", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "testadmin", password: "testpass" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("admin");
  });

  test("wrong password → 401", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "testadmin", password: "wrong" });
    expect(res.status).toBe(401);
  });

  test("missing fields → 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: "testadmin" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/register", () => {
  test("creates new user → 201", async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "newuser_jest", password: "securepass" });
    expect(res.status).toBe(201);
  });

  test("duplicate username → 409", async () => {
    await request(app).post("/api/auth/register").send({ username: "dupuser_jest", password: "pass123" });
    const res = await request(app).post("/api/auth/register").send({ username: "dupuser_jest", password: "pass123" });
    expect(res.status).toBe(409);
  });

  test("short password → 400", async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "shortpw_jest", password: "ab" });
    expect(res.status).toBe(400);
  });
});

// ── QA CRUD ───────────────────────────────────────────────────────────────────
let adminToken, editorToken, createdId;

beforeAll(async () => {
  const r1 = await request(app).post("/api/auth/login").send({ username: "testadmin",  password: "testpass" });
  const r2 = await request(app).post("/api/auth/login").send({ username: "testeditor", password: "testpass" });
  adminToken  = r1.body.token;
  editorToken = r2.body.token;
});

describe("GET /api/qa", () => {
  test("no token → 401", async () => {
    expect((await request(app).get("/api/qa")).status).toBe(401);
  });
  test("admin → 200 array", async () => {
    const res = await request(app).get("/api/qa").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/qa", () => {
  test("editor can create", async () => {
    const res = await request(app)
      .post("/api/qa")
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ question: "Test pitanje jest?", answer: "Test odgovor.", keywords: "test" });
    expect(res.status).toBe(201);
    createdId = res.body.id;
  });

  test("missing fields → 400", async () => {
    const res = await request(app)
      .post("/api/qa")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ keywords: "test" });
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/qa/:id", () => {
  test("editor can update", async () => {
    const res = await request(app)
      .put(`/api/qa/${createdId}`)
      .set("Authorization", `Bearer ${editorToken}`)
      .send({ question: "Izmenjeno pitanje jest?", answer: "Novi odgovor.", keywords: "test" });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/qa/:id", () => {
  test("editor cannot delete → 403", async () => {
    const res = await request(app)
      .delete(`/api/qa/${createdId}`)
      .set("Authorization", `Bearer ${editorToken}`);
    expect(res.status).toBe(403);
  });

  test("admin can delete", async () => {
    const res = await request(app)
      .delete(`/api/qa/${createdId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

// ── Chat ──────────────────────────────────────────────────────────────────────
describe("POST /api/chat", () => {
  test("returns answer and suggestions", async () => {
    const res = await request(app).post("/api/chat").send({ message: "radno vreme studentske službe" });
    expect(res.status).toBe(200);
    expect(typeof res.body.answer).toBe("string");
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });

  test("empty message → 400", async () => {
    const res = await request(app).post("/api/chat").send({ message: "" });
    expect(res.status).toBe(400);
  });
});

// ── Categories ────────────────────────────────────────────────────────────────
describe("GET /api/categories", () => {
  test("public access, returns array", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
