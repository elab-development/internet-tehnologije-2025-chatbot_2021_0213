# Chatbot Web Aplikacija (Seminarski projekat)

Ovaj projekat implementira:
- **Javni deo (Frontend):** Chat UI + predlozi sličnih pitanja.
- **Administratorski deo:** Login + CRUD nad bazom znanja (pitanja/odgovori/ključne reči).
- **Sopstveni REST API (Backend):** Express servis sa endpoint-ima za chat i administraciju.
- **Baza znanja:** SQLite (lokalna baza).

## Pokretanje (lokalno)

### 1) Backend
```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```
API radi na `http://localhost:4000`

### 2) Frontend
U drugom terminalu:
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```
Frontend radi na `http://localhost:3000`

## Kako radi Chatbot
1. Korisnik unese pitanje.
2. Backend učita sva Q/A pravila iz baze.
3. Radi se normalizacija teksta (mala slova, uklanjanje dijakritika, tokenizacija).
4. Skorira se svako pravilo preko:
   - preklapanja tokena sa ključnim rečima,
   - sličnosti sa tekstom pitanja,
   - preklapanja tokena sa samim pitanjem.
5. Vraća se najbolji odgovor + 3 predloga sličnih pitanja.

## Admin nalozi
Podrazumevano (iz `backend/.env` i `npm run seed`):
- username: `admin`
- password: `admin123`

Promeni u `.env` pre seed-a ako želiš.

## Struktura REST API-ja (kratko)
- `POST /api/chat` — javno, vraća odgovor i predloge
- `POST /api/auth/login` — vraća JWT
- `GET/POST/PUT/DELETE /api/qa` — admin CRUD (JWT)