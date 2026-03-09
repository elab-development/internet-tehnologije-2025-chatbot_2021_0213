# 🤖 Chatbot – Studentska služba FON

Web aplikacija chatbot sistema sa administrativnim panelom za upravljanje bazom pitanja i odgovora.

## 🏗 Tehnologije

| Sloj | Tehnologija |
|---|---|
| Frontend | Next.js 14 (React 18) |
| Backend | Node.js + Express |
| Baza | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| API dokumentacija | Swagger / OpenAPI 3.0 |
| CI/CD | GitHub Actions |
| Deploy | Docker + docker-compose |

## 🚀 Pokretanje

### Opcija A – Docker (preporučeno)

```bash
git clone <repo-url> && cd chatbot-app
cp .env.example .env          
docker compose up --build
```

| Servis | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| **Swagger docs** | **http://localhost:4000/api/docs** |

### Opcija B – Lokalno

**Backend:**
```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

**Frontend** (novi terminal):
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```


## 🔐 Nalozi (podrazumevano)

| Korisnik | Lozinka | Uloga |
|---|---|---|
| `admin` | `admin123` | admin – pun pristup |
| `editor` | `editor123` | editor – dodaje/menja, ne briše |

> ⚠️ Promeni lozinke u `.env` pre produkcijskog pokretanja!

## 📡 REST API

| Metoda | Ruta | Pristup | Opis |
|---|---|---|---|
| GET | `/api/health` | javno | Health check |
| POST | `/api/auth/login` | javno | Login → JWT |
| POST | `/api/auth/register` | javno | Registracija |
| POST | `/api/auth/logout` | auth | Odjava |
| GET | `/api/auth/me` | auth | Trenutni korisnik |
| GET | `/api/categories` | javno | Lista kategorija |
| GET | `/api/qa` | admin/editor | Lista Q&A |
| POST | `/api/qa` | admin/editor | Dodaj Q&A |
| PUT | `/api/qa/:id` | admin/editor | Izmeni Q&A |
| DELETE | `/api/qa/:id` | **admin** | Obriši Q&A |
| POST | `/api/chat` | javno | Pošalji poruku |
| GET | `/api/chat/stats` | **admin** | Statistike |

Kompletna dokumentacija: **http://localhost:4000/api/docs**

## 👥 Tipovi korisnika

- **admin** – pun pristup (CRUD, brisanje, statistike)
- **editor** – dodaje i menja Q&A, ne može brisati
- **user** – samo chat (javni deo)

## 🔒 Bezbednost

1. **XSS** – sanitizacija body polja + `Content-Security-Policy` header
2. **CORS** – whitelist dozvoljenih origina
3. **SQL Injection** – isključivo parametrizovani upiti (better-sqlite3)
4. **Brute Force** – rate limiting (login: 20/15min, chat: 30/min)
5. **Clickjacking** – `X-Frame-Options: DENY`
6. **IDOR** – role-based access control na svim rutama

## 🗄 Migracije baze (3 tipa)

| Tip | Opis | Primer |
|---|---|---|
| 1 | Kreiranje tabela | `CREATE TABLE IF NOT EXISTS roles ...` |
| 2 | Dodavanje kolone | `ALTER TABLE qa ADD COLUMN view_count INTEGER DEFAULT 0` |
| 3 | Kreiranje indeksa | `CREATE INDEX IF NOT EXISTS idx_qa_category ON qa(category_id)` |

## 🧪 Testovi

```bash
cd backend
npm install
npm test
```

Pokriva: auth (login/register/role), QA CRUD (uključujući role razlike), chat, kategorije.

## 🌿 Git grane

| Grana | Svrha |
|---|---|
| `main` | Stabilna produkciona verzija |
| `develop` | Integraciona grana |
| `feature/docker` | Dockerizacija + CI/CD |
| `feature/swagger` | OpenAPI dokumentacija |
| `feature/korisnici-kategorije` | Prošireni korisnički sistem i kategorije |

## 📂 Struktura

```
chatbot-app/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── security.js     # rate limit, XSS, headers
│   │   ├── __tests__/
│   │   │   └── api.test.js
│   │   ├── auth.js             # JWT + requireRole()
│   │   ├── db.js               # SQLite + 3 tipa migracija
│   │   ├── match.js            # algoritam za odgovore
│   │   ├── seed.js
│   │   ├── swagger.js          # OpenAPI 3.0 spec
│   │   └── index.js            # Express server
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── pages/
│   │   ├── index.js            # Chat UI
│   │   └── admin/
│   │       ├── index.js        # Admin panel
│   │       └── login.js
│   ├── components/             # Button, Card, Input
│   ├── Dockerfile
│   └── package.json
├── .github/workflows/ci.yml    # GitHub Actions
├── docker-compose.yml
└── README.md
```
