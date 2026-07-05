# ◎ Fallow — Stellar Crowdfunding dApp

A crowdfunding dApp built for **Level 2 – Yellow Belt** of the Stellar frontend challenge. Back an open-source campaign with **real testnet XLM** that is held in **escrow by a Soroban smart contract**, and watch the funding progress update in real time. Connect **any** Stellar wallet (Freighter, xBull, Albedo, Lobstr, Rabet, Hana) via StellarWalletsKit.

> Level 1 (the tip-jar) lives in this repo's git history; `main` is now the Level 2 crowdfunding app.

## What it does

- 🔌 **Multi-wallet** connect via StellarWalletsKit — Freighter, xBull, Albedo, Lobstr, Rabet, Hana.
- 📜 **Soroban smart contract** deployed on testnet holds contributions in escrow.
- 💸 **Contribute** real testnet XLM — the contract pulls funds in via the native asset contract and records your pledge.
- 📊 **Live progress bar** — raised / goal / backers / time-left, polled from contract state.
- 📡 **Real-time activity feed** — contract events (`contribute` / `goal_reached` / `withdrawn` / `refund`) streamed by polling Soroban RPC's `getEvents`.
- ⏳ **Transaction status tracking** — every action shows building → signing → pending → success/fail, with a stellar.expert link on success.
- 🧯 **Error handling** — three headline categories are caught and shown distinctly: **wallet not found**, **request rejected**, **insufficient balance** (plus a generic fallback).
- 🏦 **Escrow rules on-chain** — the admin can `withdraw` once the goal is met; backers can `refund` themselves if the deadline passes unmet.

## Deployed contract (testnet)

| | |
|---|---|
| Contract ID | [`CAPBMALOG2MXQZLPWQIVCI65DG74ELN6OG4D7RR7HTYFTZWFA3YBHBDH`](https://stellar.expert/explorer/testnet/contract/CAPBMALOG2MXQZLPWQIVCI65DG74ELN6OG4D7RR7HTYFTZWFA3YBHBDH) |
| Admin | `GDMFYJCUB23Q7ID26S3KGTRAR2LAQUNDKOQ2IZOAKVRWJ3THTNSHECSQ` |
| Token collected | Native XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Goal | 1,000 XLM |
| Network | Stellar Testnet |

## Tech Stack

| Layer | Choice |
|---|---|
| Smart contract | Rust + `soroban-sdk` 26, deployed with Stellar CLI 27 |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Wallets | `@creit.tech/stellar-wallets-kit` (StellarWalletsKit) |
| Chain access | `@stellar/stellar-sdk` **Soroban RPC** (simulate / prepare / send / getEvents) |

**Horizon vs Soroban RPC:** Level 1 talked to **Horizon** (the classic API for payments & balances). Smart-contract calls go through **Soroban RPC** (`soroban-testnet.stellar.org`) instead — a separate endpoint used to *simulate* reads, *prepare* (assemble auth + footprint) and *send* writes, and stream contract *events*. Soroban has no websockets, so "real-time" here means polling `getEvents` + contract state on a 5s interval.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18.18+
- A Stellar wallet extension set to **Testnet** (e.g. [Freighter](https://freighter.app) → Settings → Network → Testnet)

### Run the frontend

The deployed testnet contract is baked into `src/lib/config.ts`, so no env setup is needed:

```sh
git clone https://github.com/HimanshuM685/Fallow.git
cd Fallow
npm install
npm run dev
```

Open http://localhost:3000 in a browser with a Stellar wallet installed. Use **"Need test XLM?"** (Friendbot) to fund a fresh account, then contribute.

### Build for production

```sh
npm run build
npm run start
```

## The smart contract

Rust source is in [`contract/crowdfund/`](contract/crowdfund/src/lib.rs). Functions:

| Function | Who | Effect |
|---|---|---|
| `initialize(admin, token, goal, deadline)` | deployer, once | configures the campaign |
| `contribute(from, amount)` | anyone | transfers `amount` into escrow, records the pledge, emits `contrib` (and `reached` when the goal is crossed) |
| `withdraw()` | admin | sends all escrowed funds to the admin — only once the goal is met |
| `refund(from)` | backer | returns a backer's contribution — only after the deadline if the goal was missed |
| `get_campaign()` / `get_contribution(who)` | anyone (read) | current totals / a single backer's total |

### Build, test & deploy it yourself

```sh
cd contract
cargo test                       # 5 unit tests (contribute / withdraw / refund / deadline)
stellar contract build           # -> target/wasm32v1-none/release/crowdfund.wasm

# fund a deployer, deploy, and initialize
stellar keys generate deployer --network testnet --fund
CID=$(stellar contract deploy --wasm target/wasm32v1-none/release/crowdfund.wasm \
  --source deployer --network testnet)
TOKEN=$(stellar contract id asset --asset native --network testnet)
stellar contract invoke --id "$CID" --source deployer --network testnet -- \
  initialize --admin "$(stellar keys address deployer)" --token "$TOKEN" \
  --goal 10000000000 --deadline "$(date -v+30d +%s)"
```

Then put the new `$CID` in `src/lib/config.ts` (or set `NEXT_PUBLIC_CONTRACT_ID`).

## How to use

1. **Connect wallet** → pick any wallet in the StellarWalletsKit modal.
2. If your account is unfunded, click **Need test XLM?** to fund it via Friendbot.
3. Pick a preset (25 / 100 / 250) or enter a custom amount and click **Contribute** — watch the status go building → signing → pending → success.
4. The progress bar, backer count, and **Live activity** feed update automatically as events land on-chain.
5. If you're the **admin** and the goal is met, a **Withdraw** button appears. If the **deadline** passes with the goal unmet, backers see a **Refund** button.

## Requirements checklist (Level 2)

- ✅ **3 error types handled** — wallet not found, request rejected, insufficient balance (`describeError` in `src/lib/soroban.ts`).
- ✅ **Contract deployed on testnet** — see contract ID above.
- ✅ **Contract called from the frontend** — reads via simulation, writes via prepare → sign → send (`src/lib/soroban.ts`).
- ✅ **Transaction status visible** — building / signing / pending / success / fail in the widget.
- ✅ **Real-time event integration** — `getEvents` polling drives the live activity feed + progress.

## Screenshots

> All screenshots are on the **Stellar testnet**.

### Wallet connected & campaign progress

<!-- TODO: capture with a wallet connected — header chip + progress bar visible -->
![Wallet connected and live progress](docs/screenshots/l2-connected.png)

### Contribution — transaction status → success

<!-- TODO: capture the status pill and/or the success banner with a tx hash -->
![Contribution transaction status and success](docs/screenshots/l2-transaction.png)

### On-chain confirmation (stellar.expert)

<!-- TODO: capture the contribute tx on stellar.expert -->
![Contribution confirmed on stellar.expert](docs/screenshots/l2-explorer.png)

## Project structure

```
contract/
└── crowdfund/
    ├── src/lib.rs          # escrow crowdfunding contract
    └── src/test.rs         # unit tests
src/
├── app/
│   ├── layout.tsx          # root layout + metadata
│   ├── globals.css         # theme tokens + all component styles
│   └── page.tsx            # "/" → Campaign (client-only, ssr:false)
├── components/
│   └── Campaign.tsx        # UI: connect, progress, contribute, tx status, activity
└── lib/
    ├── config.ts           # contract id, SAC id, RPC url, campaign copy
    ├── soroban.ts          # Soroban RPC: reads, writes, events, errors
    └── wallet.ts           # StellarWalletsKit multi-wallet connector
```

## Notes

- Runs **exclusively on the Stellar testnet** — no real funds involved.
- Contributions actually move XLM: `contribute` calls the native Stellar Asset Contract's `transfer` to pull funds into the contract, authorized by the connected wallet's signature.
- Contract state TTL is extended on each write so a testnet campaign doesn't get archived mid-demo.
