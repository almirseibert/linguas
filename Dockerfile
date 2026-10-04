# Um único container: a API Express serve também o build do front (PWA)
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# (better-sqlite3 é opcional: só usado no dev local; se não compilar no Linux, o npm segue sem ele)
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
# tzdata: "hoje", sequência e horário do lembrete seguem o fuso da família (APP_TZ)
RUN apt-get update && apt-get install -y --no-install-recommends tzdata && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production DB_CLIENT=mysql PORT=3001 APP_TZ=America/Sao_Paulo AUDIO_CACHE_DIR=/data/audio-cache
COPY --from=build /app /app
VOLUME /data
EXPOSE 3001
# Aplica migrações pendentes e sobe o servidor
CMD ["sh", "-c", "npm run migrate -w apps/api && npm run start -w apps/api"]
