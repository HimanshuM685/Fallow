# Fallow — Setup & Deployment

This covers full local setup, Stellar testnet account prep, and production deployment of each
component. For the project overview and the demo script, see [README.md](./README.md).

---

## 1. Prerequisites

| Tool | Why | Install |
|---|---|---|
| Node 20+ & npm | runs everything | https://nodejs.org |
| **Neon** Postgres | stores wallets, top-ups, charges, payouts (`DATABASE_URL`) — *not* nodes/leases | https://neon.tech (free tier) |
| Docker (daemon running) | the contributor agent's SSH sandboxes | https://docs.docker.com |
| SSH client | renters connect to a rented box (public exposure uses an in-container **bore** tunnel — nothing to install on the contributor) | built into macOS/Linux/Windows |
| Stellar **testnet** accounts | platform (receives top-ups **+ pays contributors**), contributor, consumer (pays) | see below |

### Stellar testnet account prep

Payments are **native XLM**, so there's no trustline and no asset opt-in. Users **top up** a prepaid
balance by sending XLM to the **platform custodial address** (`PLATFORM_PAYTO`); the registry
confirms each deposit on-chain and credits an off-chain ledger in Neon. On lease end it bills the
usage once and **pays the contributor on-chain** from the platform account.

- **Platform account (`PLATFORM_PAYTO` + `PLATFORM_PRIVATE_KEY`):** generate a key with
  `npm run keygen`; use its **Address** (`G…`) as `PLATFORM_PAYTO` and its **`STELLAR_PRIVATE_KEY`**
  (`S…`) as `PLATFORM_PRIVATE_KEY` (the registry signs payouts with it). Fund it with enough XLM to
  cover payouts + txn fees — it's the pool that holds every user's prepaid balance.
- **Consumer accounts:** funded with XLM to cover top-ups + the ~0.00001 XLM (100-stroop) deposit txn fee.

1. **Generate a key** (prints `Address` + `STELLAR_PRIVATE_KEY`):
   ```bash
   npm run keygen
   ```
2. **Fund with testnet XLM (Friendbot):** https://friendbot.stellar.org/?addr=<G…> (paste the address).
3. Keep each `STELLAR_PRIVATE_KEY` secret — it's a Stellar secret seed (`S…`).

### Deploy the ledger contract

Top-ups and payouts are relayed through a small Soroban contract (`contract/`) instead of a
plain payment — it holds no funds itself, just moves XLM between the caller and the platform
address and emits a public event, so every top-up/payout is auditable on-chain. See
[contract/README.md](./contract/README.md) for the contract itself; to deploy your own:

```bash
# Needs the `stellar` CLI (https://developers.stellar.org/docs/tools/cli/install-cli) + Rust
# with the wasm32v1-none target.
stellar keys generate deployer --network testnet --fund   # throwaway, pays deploy fees only
stellar keys generate platform --network testnet --fund   # becomes PLATFORM_PAYTO / PLATFORM_PRIVATE_KEY

cd contract && stellar contract build
stellar contract deploy \
  --wasm target/wasm32v1-none/release/fallow_ledger.wasm \
  --source deployer --network testnet \
  -- --platform "$(stellar keys address platform)"
# → prints the Contract ID — set it as CONTRACT_ID
```

`stellar keys show platform` prints the secret seed for `PLATFORM_PRIVATE_KEY`; `stellar keys
address platform` prints `PLATFORM_PAYTO`.

---

## 2. Local setup

```bash
git clone <repo> fallow && cd fallow
npm install
npm run build:shared          # compiles @fallow/shared to dist/ (contributor/backend/example-buyer import the built output)
cp .env.example .env          # edit values; root .env is picked up by all Node apps
```

`.env` is read by the backend, contributor, and example-buyer (each app's own `.env` overrides the
root one; inline `FOO=bar npm run ...` overrides both). The web app reads `web/.env` (Vite,
`VITE_*` only).

Run each piece in its own terminal:

```bash
npm run backend       # http://localhost:4000  (needs DATABASE_URL + PLATFORM_PAYTO + PLATFORM_PRIVATE_KEY)
npm run contributor   # contributor daemon (needs STELLAR_PRIVATE_KEY + Docker running)
npm run web           # http://localhost:5173
npm run client        # the autonomous consumer agent (needs its own funded STELLAR_PRIVATE_KEY)
```

Tips:
- The SSH sandbox image builds locally on the first rent (from `contributor/sandbox-ssh`) and is
  cached after — the first rent waits on that one-time build.
- Running the agent on the **same machine** as the consumer? Set `TUNNEL_MODE=local` to skip bore and
  SSH to `127.0.0.1:<port>` instead.
- Useful checks: `curl localhost:4000/health`, `curl localhost:4000/explorer`.

---

## 3. Production deployment

Three independently deployable pieces: **backend** (central registry service), **web** (static
site), **contributor** (runs on each contributor's own machine). The autonomous client runs anywhere.

### 3a. Backend / registry (central API)

Requirements: a long-running Node host with **WebSocket** support, a **Neon** Postgres database
(`DATABASE_URL`), outbound HTTPS to a **Soroban RPC** endpoint (to confirm top-ups **and send
payouts** through the ledger contract), and (if the web app is HTTPS) **TLS**. No local disk/volume
— only money state lives in Neon; nodes
and leases are in-memory.

> ⚠️ **Not serverless-compatible (Vercel/Netlify functions, AWS Lambda).** The registry holds
> persistent Socket.IO connections to every contributor and keeps nodes/leases in process memory;
> serverless platforms kill idle instances and can't hold WebSockets open. Deploy the backend to a
> long-running host (Options A–C below) and put only the **web** app on Vercel.

**Option A — Docker (provided):**
```bash
# build from the repo root
docker build -f backend/Dockerfile -t fallow-backend .
docker run -d --name fallow-backend \
  -p 4000:4000 \
  -e DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require" \
  -e PLATFORM_PAYTO=<your-platform-stellar-address-G...> \
  -e PLATFORM_PRIVATE_KEY=<stellar-secret-seed-S...> \
  -e PLATFORM_FEE_PCT=10 \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e CORS_ORIGIN=https://fallow.your-domain.com \
  fallow-backend
```

**Option B — PaaS (Railway / Render / Fly.io):**
- Build command: `npm ci && npm run build:backend` · Start command: `npm run start -w backend`.
- Set env vars (below). No volume needed — point `DATABASE_URL` at Neon.
- The server binds `PORT` when the platform injects it (`REGISTRY_PORT` still wins locally).
- Ensure WebSockets are enabled (Render/Railway: on by default; Fly: TCP/HTTP service is fine).

**Option C — bare VPS + systemd + nginx:**
- `npm ci && npm run build:backend` on the box, run `npm run start -w backend` under systemd (or pm2).
- Put nginx/Caddy in front for TLS, and **proxy WebSocket upgrades**:
  ```nginx
  location / {
      proxy_pass http://127.0.0.1:4000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_set_header Host $host;
  }
  ```

Registry env vars:

| Var | Default | Notes |
|---|---|---|
| `REGISTRY_PORT` | `4000` | falls back to the platform-injected `PORT` if unset |
| `DATABASE_URL` | — | **required** — Neon Postgres connection string (keep `?sslmode=require`) |
| `PLATFORM_PAYTO` | — | **required** — custodial Stellar address (`G…`) that receives top-ups |
| `PLATFORM_PRIVATE_KEY` | — | **required for payouts** — Stellar secret seed (`S…`) for `PLATFORM_PAYTO`; signs on-chain contributor payouts. If unset, payouts are recorded as unpaid |
| `CONTRACT_ID` | — | **required** — contract id (`C…`) of the Fallow ledger contract every top-up/payout is relayed through (see [contract/README.md](./contract/README.md)) |
| `PLATFORM_FEE_PCT` | `10` | platform's % cut of each charge; the rest is paid to the contributor |
| `JWT_SECRET` | dev value | **set a strong secret in prod** (signs wallet-session + lease tokens) |
| `CORS_ORIGIN` | `*` | set to your web origin(s), comma-separated |
| `HEARTBEAT_TIMEOUT_MS` | `30000` | node considered offline after this gap |
| `XLM_USD_PRICE` | `0.11` | USD per 1 XLM — converts the USD price to the stroops/**hour** rate |
| `METER_INTERVAL_MS` | `10000` | how often the **watchdog** checks active leases for balance exhaustion (no per-tick billing) |
| `SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban RPC used to submit + confirm topup/payout contract calls |
| `NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | Stellar network passphrase (part of every signature) |

### 3b. Web app (static SPA)

It's a Vite build — pure static assets. Set `VITE_REGISTRY_URL` **at build time**.

```bash
VITE_REGISTRY_URL=https://api.your-fallow-domain.com npm run build -w web
# output: web/dist  → upload to any static host
```

**Vercel / Netlify / Cloudflare Pages:**
- Build command: `npm install && npm run build -w web`
- Output directory: `web/dist`
- Env var: `VITE_REGISTRY_URL = https://api.your-fallow-domain.com`
- SPA rewrite: serve `index.html` for all routes (Netlify `_redirects`: `/* /index.html 200`;
  Vercel/CF Pages handle SPAs automatically).

> **Mixed content:** if the site is served over HTTPS, the registry **must** also be HTTPS/WSS,
> or browsers will block the API + socket calls.

### 3c. Contributor agent (on each contributor's machine)

The agent is *not* centrally deployed — each contributor runs it on the machine whose compute they
share. It needs Docker locally; SSH is exposed by a **bore** tunnel that runs *inside* each sandbox
(it dials out), so there's nothing extra to install or open.

```bash
# on the contributor's machine
git clone <repo> fallow && cd fallow && npm install
STELLAR_PRIVATE_KEY=<their-key> \
REGISTRY_URL=https://api.your-fallow-domain.com \
NODE_LABEL="ryzen-3090-box" PRICE_PER_HOUR_USD=2.0 SANDBOX_GPUS=all \
  npm run contributor
```

Keep it alive with **pm2** (`pm2 start "npm run contributor" --name fallow-contributor`) or a systemd unit.
The renter gets an `ssh root@<bore-host> -p <port>` command (password = the renter's wallet address).
`PAYTO_ADDR` (defaults to the signing address) is where this node's **on-chain payouts** land. To run
your own bore server instead of the public `bore.pub`, point `BORE_SERVER` at it.

Agent env vars: `STELLAR_PRIVATE_KEY` (required), `REGISTRY_URL`, `NODE_LABEL`, `PRICE_PER_HOUR_USD`,
`PAYTO_ADDR` (defaults to the signing address — receives payouts), `SANDBOX_IMAGE` (defaults to the
locally-built `fallow-ssh-sandbox`), `SANDBOX_MEMORY`, `SANDBOX_CPUS`, `SANDBOX_GPUS` (`all` to pass
GPUs), `TUNNEL_MODE` (`bore`|`local`), `BORE_SERVER` (default `bore.pub`).

### 3d. Autonomous consumer agent

Runs anywhere (CI, a laptop, a server) with a funded key:

```bash
STELLAR_PRIVATE_KEY=<buyer-key> REGISTRY_URL=https://api.your-fallow-domain.com \
AGENT_MIN_RAM_MB=2048 AGENT_TOPUP_XLM=2 npm run client
```

It signs in, tops up its prepaid balance if it's below `AGENT_TOPUP_XLM`, rents the cheapest
matching node, runs its job, and releases — reporting how much balance it drew down.

---

## 4. Production checklist

- [ ] Strong `JWT_SECRET` on the registry.
- [ ] `DATABASE_URL` points at Neon; `PLATFORM_PAYTO` + `PLATFORM_PRIVATE_KEY` set to an account you
      control and **funded** (it pays out every contributor); `PLATFORM_FEE_PCT` reviewed.
- [ ] `CORS_ORIGIN` locked to your web origin.
- [ ] Registry + web both HTTPS (avoid mixed-content blocking); WebSocket upgrades proxied.
- [ ] Soroban RPC (`SOROBAN_RPC_URL`) reachable from the registry host (top-ups + payouts) and clients; `CONTRACT_ID` set to your deployed ledger contract.
- [ ] `XLM_USD_PRICE` set to a sane rate (or wired to a price feed); `METER_INTERVAL_MS` reviewed.
- [ ] `VITE_REGISTRY_URL` + `VITE_SOROBAN_RPC_URL` baked into the web build.
- [ ] Contributors pre-build `SANDBOX_IMAGE` (`docker build -t fallow-ssh-sandbox contributor/sandbox-ssh`);
      agents kept alive (pm2/systemd) with Docker running + outbound network for bore.
- [ ] Consumer accounts hold **XLM** for top-ups (+ txn fees). No trustline / asset opt-in needed.
- [ ] Safeguard `PLATFORM_PRIVATE_KEY` — it custodies user top-ups *and* signs every payout.

## 5. Known limitations

- **Custodial:** top-ups pool at `PLATFORM_PAYTO` and balances are an off-chain ledger in Neon.
  Contributor earnings **are** settled on-chain at lease end (via `PLATFORM_PRIVATE_KEY`); there's no
  on-chain *renter* withdrawal path for unused balance yet.
- **Billing granularity:** usage is calculated continuously but **charged once**, at lease end,
  prorated at the hourly rate. The watchdog only checks balance exhaustion every `METER_INTERVAL_MS`,
  so worst-case over-use is one tick before teardown.
- **In-memory nodes/leases:** a registry restart drops live sessions (their sockets die too). This is
  deliberate — it keeps Postgres out of the heartbeat/watchdog hot path. For HA, persist + externalize.
- **SSH auth** is a per-lease password (the renter's wallet address) on a throwaway root container —
  fine for ephemeral compute, but use a key-based flow for anything sensitive.
- `XLM_USD_PRICE` is a static rate; for production wire it to a price feed so charges track the market.
- A single registry instance owns the WebSocket hub *and* the in-memory state; for horizontal scale
  externalize both (e.g. a socket.io Redis adapter + shared store).
- The public `bore.pub` server is best-effort/rate-limited; run your own `BORE_SERVER` for anything
  beyond demos.
