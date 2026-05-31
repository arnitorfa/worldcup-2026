# Íþróttir framundan — Docker image for Synology NAS
# Build context must be the REPO ROOT (one level above this file).
# Usage (from repo root):
#   docker compose -f docker/docker-compose.yml up -d --build

FROM node:20-alpine

WORKDIR /app

# Copy shared fetchers and frontend from repo root
COPY fetchers/ ./fetchers/
COPY public/   ./public/

# Copy docker-specific files
COPY docker/package.json ./package.json
COPY docker/server.js    ./server.js

# Install only production deps (express, cors)
RUN npm install --production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
