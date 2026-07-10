# Contributor agent. Build from the REPO ROOT:
#   docker build -f contributor/Dockerfile -t tendril-contributor .
#
# At runtime it needs the HOST Docker daemon (to launch sandboxes). SSH is exposed
# by a bore tunnel running INSIDE each sandbox (it dials out), so the contributor
# itself needs no inbound ports. Standalone:
#   docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
#     --env-file .env -e REGISTRY_URL=http://localhost:4000 tendril-contributor
# (Add --network host only if you use TUNNEL_MODE=local for same-machine SSH.)
FROM node:20-slim

WORKDIR /app

# docker CLI only (talks to the mounted host daemon to launch sandboxes).
# NOTE: Debian's `docker.io` package ships an old client (API 1.41) that modern
# daemons reject ("client version too old, minimum supported API is 1.44"), so
# install the official STATIC docker client binary (CLI only, no daemon) instead.
ARG DOCKER_CLI_VERSION=27.3.1
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL "https://download.docker.com/linux/static/stable/$(uname -m)/docker-${DOCKER_CLI_VERSION}.tgz" \
         | tar -xz -C /usr/local/bin --strip-components=1 docker/docker \
    && chmod +x /usr/local/bin/docker

# Install only the workspaces the contributor needs (uses the root lockfile).
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY contributor/package.json contributor/
RUN npm ci --workspace contributor --include-workspace-root

# Copy sources.
COPY tsconfig.base.json ./
COPY shared shared
COPY contributor contributor

CMD ["npm", "run", "start", "-w", "contributor"]
