# Backend (registry) container. Build from the REPO ROOT (it needs the workspace):
#   docker build -f backend/Dockerfile -t tendril-backend .
#   docker run -p 4000:4000 --env-file .env tendril-backend
# State lives in Neon (Postgres) via DATABASE_URL — no local volume needed.
FROM node:20-slim

WORKDIR /app

# Install only the workspaces the backend needs (uses the root lockfile).
# pg is pure JS — no native toolchain required.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root

# Copy sources.
COPY tsconfig.base.json ./
COPY shared shared
COPY backend backend

ENV REGISTRY_PORT=4000
EXPOSE 4000

CMD ["npm", "run", "start", "-w", "backend"]
