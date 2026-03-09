# Chatbot Backend (Express + SQLite)

## Setup
```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

API: `http://localhost:4000`

## Endpoints
- `POST /api/chat` { message }
- `POST /api/auth/login` { username, password }
- `GET /api/qa` (Bearer token)
- `POST /api/qa` (Bearer token)
- `PUT /api/qa/:id` (Bearer token)
- `DELETE /api/qa/:id` (Bearer token)