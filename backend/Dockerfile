# Backend (registry) container. Build from the REPO ROOT (it needs the workspace):
#   docker build -f backend/Dockerfile -t fallow-backend .
#   docker run -p 4000:4000 --env-file .env fallow-backend
# State lives in Neon (Postgres) via DATABASE_URL — no local volume needed.
FROM node:20-slim AS build

WORKDIR /app

# Install the workspaces the backend needs, WITH dev deps (typescript) for the build.
# NOTE: shared's full source (incl. tsconfig.json) must be present before `npm ci` —
# npm's --ignore-scripts doesn't skip a local workspace's `prepare` script, so it still
# tries to run shared's `tsc -b` during install.
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY shared shared
COPY backend/package.json backend/
RUN npm ci --workspace backend --include-workspace-root --ignore-scripts

# Copy remaining sources and compile shared + backend to plain JS.
COPY backend backend
RUN npx tsc -b shared backend

# ── Runtime image: prod deps + compiled dist only ───────────────────────────
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY shared shared
COPY backend/package.json backend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root --ignore-scripts

COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist

ENV REGISTRY_PORT=4000
EXPOSE 4000

CMD ["node", "backend/dist/index.js"]
