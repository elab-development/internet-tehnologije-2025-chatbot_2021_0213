import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DB_PATH || "./data/chatbot.db";
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate() {
  // ── MIGRATION TYPE 1: CREATE TABLES ──────────────────────────────────────

  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      role_id       INTEGER NOT NULL DEFAULT 3,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS qa (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      question    TEXT NOT NULL,
      answer      TEXT NOT NULL,
      keywords    TEXT NOT NULL DEFAULT '',
      category_id INTEGER,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS chat_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,
      message    TEXT NOT NULL,
      response   TEXT NOT NULL,
      matched_qa INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id)    REFERENCES users(id),
      FOREIGN KEY (matched_qa) REFERENCES qa(id)
    );
  `);

  // Seed roles
  const insertRole = db.prepare("INSERT OR IGNORE INTO roles (name) VALUES (?)");
  ["admin", "editor", "user"].forEach(r => insertRole.run(r));

  // Seed categories
  const insertCat = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
  ["Opšte", "Administracija", "Ispiti", "Studije", "Tehničko"].forEach(c => insertCat.run(c));

  // ── MIGRATION TYPE 2: ADD COLUMNS (idempotent) ────────────────────────────

  const qaCols = db.prepare("PRAGMA table_info(qa)").all().map(c => c.name);

  if (!qaCols.includes("view_count")) {
    db.prepare("ALTER TABLE qa ADD COLUMN view_count INTEGER DEFAULT 0").run();
    console.log("[migrate] Added qa.view_count");
  }
  if (!qaCols.includes("is_active")) {
    db.prepare("ALTER TABLE qa ADD COLUMN is_active INTEGER DEFAULT 1").run();
    console.log("[migrate] Added qa.is_active");
  }

  const chatCols = db.prepare("PRAGMA table_info(chat_logs)").all().map(c => c.name);
  if (!chatCols.includes("user_id")) {
    db.prepare("ALTER TABLE chat_logs ADD COLUMN user_id INTEGER").run();
    console.log("[migrate] Added chat_logs.user_id");
  }
  if (!chatCols.includes("matched_qa")) {
    db.prepare("ALTER TABLE chat_logs ADD COLUMN matched_qa INTEGER").run();
    console.log("[migrate] Added chat_logs.matched_qa");
  }

  // ── MIGRATION TYPE 3: INDEXES / ADDITIONAL CONSTRAINTS ───────────────────

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_qa_category    ON qa(category_id);
    CREATE INDEX IF NOT EXISTS idx_qa_is_active   ON qa(is_active);
    CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role_id);
    CREATE INDEX IF NOT EXISTS idx_chat_logs_user ON chat_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_logs_date ON chat_logs(created_at);
  `);

  console.log("[migrate] Migration complete");
}
