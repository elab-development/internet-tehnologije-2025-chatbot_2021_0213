#!/bin/sh
set -e

export DB_PATH=/data/chatbot.db

if [ ! -f "$DB_PATH" ]; then
  echo "🌱 First run – seeding database…"
  node src/seed.js
fi

exec "$@"
