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
  question: "Gde se nalazi studentska služba?",
  answer: "Studentska služba se nalazi u prizemlju stare zgrade na Fakultetu organizacionih nauka.",
  keywords: "studentska služba, lokacija, gde se nalazi"
},
{
  question: "Koje je radno vreme studentske službe?",
  answer: "Radno vreme studentske službe je od 11:00 do 13:00 časova.",
  keywords: "radno vreme, studentska služba, vreme"
},
{
  question: "Koja je e-mail adresa studentske službe FON-a?",
  answer: "E-mail adresa studentske službe je studentska@en.fon.bg.ac.rs.",
  keywords: "email, e-mail, studentska služba, kontakt"
},
{
  question: "Koji telefon da zovem za ispite?",
  answer: "Za pitanja u vezi sa ispitima možete pozvati +381 11 3950 811.",
  keywords: "ispiti, telefon, kontakt"
},
{
  question: "Koji telefon da zovem za opšta studentska pitanja?",
  answer: "Za studentska pitanja možete pozvati +381 11 3950 810 ili +381 11 3950 813.",
  keywords: "studentska pitanja, telefon, kontakt"
},
{
  question: "Koji telefon je za diplomske i završne radove?",
  answer: "Za diplomske i završne radove zadužen je broj +381 11 3950 809.",
  keywords: "diplomski rad, završni rad, telefon"
},
{
  question: "Koji telefon je za alumni i studentsku praksu?",
  answer: "Za alumni i studentsku praksu zadužen je broj +381 11 3950 874.",
  keywords: "alumni, studentska praksa, telefon"
},
{
  question: "Gde mogu da se informišem o diplomskom ili završnom radu?",
  answer: "Za pitanja u vezi sa diplomskim i završnim radovima možete kontaktirati studentsku službu na +381 11 3950 809 ili putem e-maila.",
  keywords: "diplomski rad, završni rad, informacije"
},
{
  question: "Imam pitanje u vezi sa statusom studenta, kome da se obratim?",
  answer: "Za pitanja u vezi sa statusom studenta možete pozvati +381 11 3950 810 ili +381 11 3950 813.",
  keywords: "status studenta, kontakt, studentska služba"
},
{
  question: "Gde mogu da dobijem informacije o studentskoj praksi?",
  answer: "Zvanični sajt za studentsku praksu je http://praksa.fon.bg.ac.rs.",
  keywords: "studentska praksa, praksa, sajt"
},
{
  question: "Ne mogu da prijavim ispit, zašto?",
  answer: "Proverite da li ste izmirili sve obaveze i da li je rok za prijavu ispita otvoren.",
  keywords: "prijava ispita, problem, ispit"
},
{
  question: "Mogu li da zamrznem godinu?",
  answer: "Zamrzavanje godine je moguće u posebnim slučajevima uz odgovarajuću dokumentaciju.",
  keywords: "zamrzavanje godine, status, studije"
},
{
  question: "Izgubila sam indeks, šta da radim?",
  answer: "Potrebno je da se obratite studentskoj službi radi izdavanja duplikata indeksa.",
  keywords: "izgubljen indeks, duplikat, studentska služba"
},
{
  question: "Treba mi potvrda da sam student.",
  answer: "Potvrdu o statusu studenta možete dobiti u studentskoj službi tokom radnog vremena.",
  keywords: "potvrda, status studenta"
},
{
  question: "Treba mi potvrda za stipendiju.",
  answer: "Potvrda za stipendiju se izdaje u studentskoj službi na zahtev studenta.",
  keywords: "stipendija, potvrda"
},
{
  question: "Mogu li da pređem sa samofinansiranja na budžet?",
  answer: "Promena statusa zavisi od ostvarenih uslova i rang liste.",
  keywords: "budžet, samofinansiranje, status"
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
