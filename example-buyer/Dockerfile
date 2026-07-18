# Autonomous buyer (one-shot demo). Build from the REPO ROOT:
#   docker build -f example-buyer/Dockerfile -t fallow-buyer .
#   docker run --rm --env-file .env -e REGISTRY_URL=http://your-host:4000 fallow-buyer
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY example-buyer/package.json example-buyer/
RUN npm ci --workspace example-buyer --include-workspace-root --ignore-scripts

COPY tsconfig.base.json ./
COPY shared shared
COPY example-buyer example-buyer
# tsx runs the buyer's own TS directly, but @fallow/shared resolves to dist/.
RUN npx tsc -b shared

CMD ["npm", "run", "start", "-w", "example-buyer"]
