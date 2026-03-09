# Chatbot Backend (Express + SQLite)

## Pokretanje pomoću Dockera (preporučeno)
```bash
docker compose up --build
```
- API: http://localhost:4000
- Swagger dokumentacija: http://localhost:4000/api/docs

## Pokretanje lokalno (bez Dockera)
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Endpoints
- `POST /api/chat` { message }
- `POST /api/auth/login` { username, password }
- `POST /api/auth/register` { username, password }
- `GET /api/auth/me` (Bearer token)
- `GET /api/qa` (Bearer token)
- `POST /api/qa` (Bearer token) — admin, editor
- `PUT /api/qa/:id` (Bearer token) — admin, editor
- `DELETE /api/qa/:id` (Bearer token) — samo admin
- `GET /api/categories` (javno)
- `GET /api/chat/stats` (Bearer token) — samo admin