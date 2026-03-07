import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, migrate } from "./db.js";

migrate();

const adminUser = process.env.ADMIN_USER || "admin";
const adminPass = process.env.ADMIN_PASS || "admin123";

const adminRoleId  = db.prepare("SELECT id FROM roles WHERE name='admin'").get()?.id;
const editorRoleId = db.prepare("SELECT id FROM roles WHERE name='editor'").get()?.id;

// Admin user
if (!db.prepare("SELECT id FROM users WHERE username=?").get(adminUser)) {
  const hash = bcrypt.hashSync(adminPass, 10);
  db.prepare("INSERT INTO users (username, password_hash, created_at, role_id) VALUES (?,?,?,?)")
    .run(adminUser, hash, new Date().toISOString(), adminRoleId);
  console.log(`Seeded admin: ${adminUser} / ${adminPass}`);
}

// Editor user
if (!db.prepare("SELECT id FROM users WHERE username='editor'").get()) {
  const hash = bcrypt.hashSync("editor123", 10);
  db.prepare("INSERT INTO users (username, password_hash, created_at, role_id) VALUES (?,?,?,?)")
    .run("editor", hash, new Date().toISOString(), editorRoleId);
  console.log("Seeded editor: editor / editor123");
}

// Q/A entries
const count = db.prepare("SELECT COUNT(*) AS c FROM qa").get().c;
if (count === 0) {
  const now = new Date().toISOString();
  const getCat = name => db.prepare("SELECT id FROM categories WHERE name=?").get(name)?.id || null;

  const seedQA = [
    { question: "Gde se nalazi studentska služba?", answer: "Studentska služba se nalazi u prizemlju stare zgrade na Fakultetu organizacionih nauka.", keywords: "studentska služba, lokacija, gde se nalazi", category: "Administracija" },
    { question: "Koje je radno vreme studentske službe?", answer: "Radno vreme studentske službe je od 11:00 do 13:00 časova.", keywords: "radno vreme, studentska služba, vreme", category: "Administracija" },
    { question: "Koja je e-mail adresa studentske službe FON-a?", answer: "E-mail adresa studentske službe je studentska@en.fon.bg.ac.rs.", keywords: "email, e-mail, studentska služba, kontakt", category: "Administracija" },
    { question: "Koji telefon da zovem za ispite?", answer: "Za pitanja u vezi sa ispitima možete pozvati +381 11 3950 811.", keywords: "ispiti, telefon, kontakt", category: "Ispiti" },
    { question: "Koji telefon da zovem za opšta studentska pitanja?", answer: "Za studentska pitanja možete pozvati +381 11 3950 810 ili +381 11 3950 813.", keywords: "studentska pitanja, telefon, kontakt", category: "Opšte" },
    { question: "Koji telefon je za diplomske i završne radove?", answer: "Za diplomske i završne radove zadužen je broj +381 11 3950 809.", keywords: "diplomski rad, završni rad, telefon", category: "Studije" },
    { question: "Koji telefon je za alumni i studentsku praksu?", answer: "Za alumni i studentsku praksu zadužen je broj +381 11 3950 874.", keywords: "alumni, studentska praksa, telefon", category: "Studije" },
    { question: "Gde mogu da se informišem o diplomskom ili završnom radu?", answer: "Za pitanja u vezi sa diplomskim i završnim radovima možete kontaktirati studentsku službu na +381 11 3950 809 ili putem e-maila.", keywords: "diplomski rad, završni rad, informacije", category: "Studije" },
    { question: "Imam pitanje u vezi sa statusom studenta, kome da se obratim?", answer: "Za pitanja u vezi sa statusom studenta možete pozvati +381 11 3950 810 ili +381 11 3950 813.", keywords: "status studenta, kontakt, studentska služba", category: "Administracija" },
    { question: "Gde mogu da dobijem informacije o studentskoj praksi?", answer: "Zvanični sajt za studentsku praksu je http://praksa.fon.bg.ac.rs.", keywords: "studentska praksa, praksa, sajt", category: "Studije" },
    { question: "Ne mogu da prijavim ispit, zašto?", answer: "Proverite da li ste izmirili sve obaveze i da li je rok za prijavu ispita otvoren.", keywords: "prijava ispita, problem, ispit", category: "Ispiti" },
    { question: "Mogu li da zamrznem godinu?", answer: "Zamrzavanje godine je moguće u posebnim slučajevima uz odgovarajuću dokumentaciju.", keywords: "zamrzavanje godine, status, studije", category: "Administracija" },
    { question: "Izgubila sam indeks, šta da radim?", answer: "Potrebno je da se obratite studentskoj službi radi izdavanja duplikata indeksa.", keywords: "izgubljen indeks, duplikat, studentska služba", category: "Administracija" },
    { question: "Treba mi potvrda da sam student.", answer: "Potvrdu o statusu studenta možete dobiti u studentskoj službi tokom radnog vremena.", keywords: "potvrda, status studenta", category: "Administracija" },
    { question: "Treba mi potvrda za stipendiju.", answer: "Potvrda za stipendiju se izdaje u studentskoj službi na zahtev studenta.", keywords: "stipendija, potvrda", category: "Administracija" },
    { question: "Mogu li da pređem sa samofinansiranja na budžet?", answer: "Promena statusa zavisi od ostvarenih uslova i rang liste.", keywords: "budžet, samofinansiranje, status", category: "Studije" },
    { question: "Da li studentska služba radi tokom ispitnih rokova?", answer: "Da, studentska služba radi i tokom ispitnih rokova, ali je moguće izmenjeno radno vreme.", keywords: "ispitni rokovi, radno vreme, studentska služba", category: "Ispiti" },
    { question: "Da li je potrebno zakazivanje termina za dolazak u studentsku službu?", answer: "Ne, zakazivanje termina nije potrebno, dolazak je u okviru radnog vremena.", keywords: "zakazivanje, termin, dolazak, studentska služba", category: "Administracija" },
    { question: "Kako mogu da dobijem potvrdu o statusu studenta?", answer: "Potvrdu možete dobiti lično u studentskoj službi ili slanjem zahteva putem e-maila.", keywords: "potvrda, status studenta, e-mail", category: "Administracija" },
    { question: "Koliko se čeka izdavanje potvrde?", answer: "Potvrde se najčešće izdaju istog dana ili u roku od nekoliko radnih dana.", keywords: "izdavanje potvrde, rok, čekanje", category: "Administracija" },
    { question: "Da li studentska služba izdaje potvrde za dom i stipendiju?", answer: "Da, studentska služba izdaje potvrde potrebne za studentski dom, stipendije i kredite.", keywords: "dom, stipendija, kredit, potvrda", category: "Administracija" },
    { question: "Kome da se obratim ako imam problem sa e-studentom?", answer: "Za probleme sa e-student sistemom obratite se studentskoj službi putem telefona ili e-maila.", keywords: "e-student, problem, kontakt", category: "Tehničko" },
    { question: "Gde mogu da proverim da li sam upisan u narednu godinu studija?", answer: "Status upisa možete proveriti u e-student sistemu ili u studentskoj službi.", keywords: "upis, naredna godina, e-student", category: "Studije" },
    { question: "Kako se vrši overa semestra?", answer: "Overa semestra se vrši u studentskoj službi nakon ispunjenja svih obaveza.", keywords: "overa semestra, obaveze, studentska služba", category: "Administracija" },
    { question: "Da li mogu nekog drugog da pošaljem umesto sebe u studentsku službu?", answer: "U većini slučajeva može, ali je za pojedine zahteve potrebna lična prisutnost ili ovlašćenje.", keywords: "ovlašćenje, dolazak, studentska služba", category: "Administracija" },
    { question: "Šta da radim ako mi nisu evidentirane ocene?", answer: "Potrebno je da se obratite predmetnom nastavniku, a zatim studentskoj službi ako problem ostane.", keywords: "ocene, evidencija, problem", category: "Ispiti" },
    { question: "Kako da promenim lične podatke (ime, prezime, adresa)?", answer: "Promena ličnih podataka se vrši u studentskoj službi uz odgovarajuću dokumentaciju.", keywords: "lični podaci, promena, dokumentacija", category: "Administracija" },
    { question: "Da li mogu da dobijem uverenje o položenim ispitima?", answer: "Da, uverenje o položenim ispitima izdaje studentska služba na zahtev studenta.", keywords: "uverenje, položeni ispiti", category: "Ispiti" },
    { question: "Kome da se obratim za ispis sa fakulteta?", answer: "Za ispis sa fakulteta potrebno je obratiti se studentskoj službi lično.", keywords: "ispis, fakultet, studentska služba", category: "Administracija" },
    { question: "Da li studentska služba šalje obaveštenja studentima?", answer: "Zvanična obaveštenja se objavljuju na sajtu fakulteta i e-mail adresama studenata.", keywords: "obaveštenja, studenti, e-mail", category: "Opšte" },
    { question: "Gde mogu da se informišem o rokovima upisa i obnove godine?", answer: "Informacije o rokovima dostupne su na sajtu FON-a i u studentskoj službi.", keywords: "rokovi, upis, obnova godine", category: "Studije" },
  ];

  const stmt = db.prepare("INSERT INTO qa (question, answer, keywords, category_id, created_at, updated_at) VALUES (?,?,?,?,?,?)");
  const tx = db.transaction(rows => {
    for (const r of rows) stmt.run(r.question, r.answer, r.keywords, getCat(r.category), now, now);
  });
  tx(seedQA);
  console.log("Seeded Q/A entries");
} else {
  console.log("Q/A already seeded");
}
