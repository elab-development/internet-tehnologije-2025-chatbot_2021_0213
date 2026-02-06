import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, migrate } from "./db.js";

migrate();

const adminUser = process.env.ADMIN_USER || "admin";
const adminPass = process.env.ADMIN_PASS || "admin123";

const existing = db.prepare("SELECT id FROM users WHERE username=?").get(adminUser);
if (!existing) {
  const hash = bcrypt.hashSync(adminPass, 10);
  db.prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?,?,?)")
    .run(adminUser, hash, new Date().toISOString());
  console.log(`Seeded admin user: ${adminUser} / ${adminPass}`);
} else {
  console.log("Admin user already exists");
}

// Seed some Q/A
const count = db.prepare("SELECT COUNT(*) AS c FROM qa").get().c;
if (count === 0) {
  const now = new Date().toISOString();
  const seedQA = [
    {
      question: "Ko si ti?",
      answer: "Ja sam demo Chatbot. Odgovaram na predefinisana pitanja iz baze znanja.",
      keywords: "ko si, chatbot, bot, o tebi"
    },
    {
      question: "Kako da se ulogujem u admin panel?",
      answer: "Na /admin/login unesi admin nalog (podrazumevano: admin / admin123) i dobićeš token u browseru.",
      keywords: "admin, login, uloguj, prijava"
    },
    {
      question: "Kako da dodam novo pitanje i odgovor?",
      answer: "U admin delu idi na 'Knowledge Base' i klikni 'Add'. Unesi pitanje, odgovor i ključne reči (odvojene zarezom).",
      keywords: "dodaj, novo pitanje, baza znanja, keywords"
    },
    {
      question: "Koje tehnologije koristi aplikacija?",
      answer: "Backend: Node.js + Express + SQLite. Frontend: Next.js (React). Komunikacija ide preko REST API-ja.",
      keywords: "tehnologije, stack, node, express, next, react, sqlite"
    }
  ];

  const stmt = db.prepare("INSERT INTO qa (question, answer, keywords, created_at, updated_at) VALUES (?,?,?,?,?)");
  const tx = db.transaction((rows) => {
    for (const r of rows) stmt.run(r.question, r.answer, r.keywords, now, now);
  });
  tx(seedQA);
  console.log("Seeded initial Q/A");
} else {
  console.log("Q/A already seeded");
}
// Seed editor user
const editorRoleId = db.prepare(
  "SELECT id FROM roles WHERE name='editor'"
).get()?.id;

const editorExists = db.prepare(
  "SELECT id FROM users WHERE username='editor'"
).get();

if (!editorExists) {
  const hash = bcrypt.hashSync("editor123", 10);
  db.prepare(`
    INSERT INTO users (username, password_hash, created_at, role_id)
    VALUES (?,?,?,?)
  `).run("editor", hash, new Date().toISOString(), editorRoleId);

  console.log("Seeded editor user: editor / editor123");
}
