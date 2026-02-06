import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DB_PATH || "./data/chatbot.db";
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

export function migrate() {
  // USERS
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      role_id INTEGER
    )
  `).run();

  // ROLES
  db.prepare(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `).run();

  // QA
  db.prepare(`
    CREATE TABLE IF NOT EXISTS qa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      keywords TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  // Seed roles
  const roles = ["admin", "editor", "user"];
  const insertRole = db.prepare(
    "INSERT OR IGNORE INTO roles (name) VALUES (?)"
  );
  roles.forEach(r => insertRole.run(r));
}


// CATEGORIES
db.prepare(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )
`).run();

const qaCols = db.prepare("PRAGMA table_info(qa)").all();
const hasCategory = qaCols.some(c => c.name === "category_id");

if (!hasCategory) {
  db.prepare("ALTER TABLE qa ADD COLUMN category_id INTEGER").run();
}


const categories = ["Opšte", "Administracija", "Ispiti"];
const insertCat = db.prepare(
  "INSERT OR IGNORE INTO categories (name) VALUES (?)"
);

categories.forEach(c => insertCat.run(c));

// CHAT LOGS
db.prepare(`
  CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`).run();
