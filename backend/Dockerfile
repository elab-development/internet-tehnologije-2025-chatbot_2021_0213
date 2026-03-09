FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /data

EXPOSE 4000

CMD ["sh", "-c", "[ ! -f /data/chatbot.db ] && node src/seed.js; node src/index.js"]