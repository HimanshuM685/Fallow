# Graph Report - .  (2026-07-31)

## Corpus Check
- Corpus is ~38,453 words - fits in a single context window. You may not need a graph.

## Summary
- 531 nodes · 725 edges · 59 communities (31 shown, 28 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.84)
- Token cost: 0 input · 65,143 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend Auth & Payout|Backend Auth & Payout]]
- [[_COMMUNITY_Web Static Pages (AboutArchBalance)|Web Static Pages (About/Arch/Balance)]]
- [[_COMMUNITY_Shared Message & Type Contracts|Shared Message & Type Contracts]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Contributor Docker Sandbox|Contributor Docker Sandbox]]
- [[_COMMUNITY_Web Dependencies|Web Dependencies]]
- [[_COMMUNITY_Ledger Contract Deployment Docs|Ledger Contract Deployment Docs]]
- [[_COMMUNITY_Contributor Dependencies|Contributor Dependencies]]
- [[_COMMUNITY_Web TypeScript Config|Web TypeScript Config]]
- [[_COMMUNITY_Root Package Config|Root Package Config]]
- [[_COMMUNITY_Web App Shell & Wallet Context|Web App Shell & Wallet Context]]
- [[_COMMUNITY_Metrics & Leaderboard UI|Metrics & Leaderboard UI]]
- [[_COMMUNITY_Example-Buyer Dependencies|Example-Buyer Dependencies]]
- [[_COMMUNITY_Web API Client|Web API Client]]
- [[_COMMUNITY_Shared TS Base Config|Shared TS Base Config]]
- [[_COMMUNITY_Ledger Contract (Rust)|Ledger Contract (Rust)]]
- [[_COMMUNITY_Shared Package Config|Shared Package Config]]
- [[_COMMUNITY_Web Rental UI (ContributeLease)|Web Rental UI (Contribute/Lease)]]
- [[_COMMUNITY_Autonomous Buyer Agent|Autonomous Buyer Agent]]
- [[_COMMUNITY_Backend TS Config|Backend TS Config]]
- [[_COMMUNITY_Contributor TS Config|Contributor TS Config]]
- [[_COMMUNITY_Example-Buyer TS Config|Example-Buyer TS Config]]
- [[_COMMUNITY_Backend Top-up Settlement|Backend Top-up Settlement]]
- [[_COMMUNITY_Hero Art Illustration|Hero Art Illustration]]
- [[_COMMUNITY_Web Wallet Sign-in & Types|Web Wallet Sign-in & Types]]
- [[_COMMUNITY_Shared TS Config|Shared TS Config]]
- [[_COMMUNITY_Stellar Challenge Submission Notes|Stellar Challenge Submission Notes]]
- [[_COMMUNITY_Contributor Runtime Config|Contributor Runtime Config]]
- [[_COMMUNITY_Docker Compose Services|Docker Compose Services]]
- [[_COMMUNITY_Backend Runtime Config|Backend Runtime Config]]
- [[_COMMUNITY_Stellar Network Constants|Stellar Network Constants]]
- [[_COMMUNITY_Web SPA Deployment Rationale|Web SPA Deployment Rationale]]
- [[_COMMUNITY_Deployed Contract ID|Deployed Contract ID]]
- [[_COMMUNITY_Topup Endpoint & Contract Fn|Topup Endpoint & Contract Fn]]
- [[_COMMUNITY_Autonomous Agent Deployment|Autonomous Agent Deployment]]
- [[_COMMUNITY_Contributor Agent Deployment|Contributor Agent Deployment]]
- [[_COMMUNITY_Deploy Guide Overview|Deploy Guide Overview]]
- [[_COMMUNITY_Fallow Brand & Favicon|Fallow Brand & Favicon]]
- [[_COMMUNITY_Sandbox Entrypoint Script|Sandbox Entrypoint Script]]
- [[_COMMUNITY_Contributor Keygen|Contributor Keygen]]
- [[_COMMUNITY_Contract get_platform() View|Contract get_platform() View]]
- [[_COMMUNITY_Production Checklist|Production Checklist]]
- [[_COMMUNITY_Docker Compose Backend Service|Docker Compose Backend Service]]
- [[_COMMUNITY_Web Not Dockerized Note|Web Not Dockerized Note]]
- [[_COMMUNITY_Explorer Endpoint|Explorer Endpoint]]
- [[_COMMUNITY_Friendbot Faucet|Friendbot Faucet]]
- [[_COMMUNITY_Neon Off-chain Ledger|Neon Off-chain Ledger]]
- [[_COMMUNITY_Platform Signing Key|Platform Signing Key]]
- [[_COMMUNITY_Rent Endpoint|Rent Endpoint]]
- [[_COMMUNITY_Shared Package Purpose|Shared Package Purpose]]
- [[_COMMUNITY_Soroban Platform|Soroban Platform]]
- [[_COMMUNITY_Stellar Wallets Kit|Stellar Wallets Kit]]
- [[_COMMUNITY_Wallet Session Auth|Wallet Session Auth]]
- [[_COMMUNITY_XLMUSD Price Config|XLM/USD Price Config]]
- [[_COMMUNITY_Web Fonts|Web Fonts]]
- [[_COMMUNITY_Web Entry Script|Web Entry Script]]
- [[_COMMUNITY_Web Root Mount|Web Root Mount]]
- [[_COMMUNITY_Web Page Title|Web Page Title]]

## God Nodes (most connected - your core abstractions)
1. `apiError()` - 16 edges
2. `compilerOptions` - 15 edges
3. `compilerOptions` - 13 edges
4. `startSandbox()` - 10 edges
5. `formatXlm()` - 10 edges
6. `scripts` - 9 edges
7. `WalletSummary` - 9 edges
8. `endLeaseAndBill()` - 8 edges
9. `ActiveLease` - 8 edges
10. `Env` - 6 edges

## Surprising Connections (you probably didn't know these)
- `DEPLOY.md Known limitations section` --semantically_similar_to--> `Custodial model rationale: top-ups pool at platform address, off-chain Neon ledger, on-chain payout at lease end`  [INFERRED] [semantically similar]
  DEPLOY.md → README.md
- `DEPLOY.md Known limitations section` --semantically_similar_to--> `Billing rationale: usage calculated continuously but charged once at lease end, prorated`  [INFERRED] [semantically similar]
  DEPLOY.md → README.md
- `DEPLOY.md Known limitations section` --semantically_similar_to--> `In-memory nodes/leases rationale: keeps Postgres out of the heartbeat/watchdog hot path`  [INFERRED] [semantically similar]
  DEPLOY.md → README.md
- `DEPLOY.md Known limitations section` --semantically_similar_to--> `SSH auth rationale: per-lease wallet-address password on a throwaway root container, fine for ephemeral compute`  [INFERRED] [semantically similar]
  DEPLOY.md → README.md
- `endLeaseAndBill()` --calls--> `proratedCost()`  [INFERRED]
  backend/src/leases.ts → shared/src/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **verify-dapp Verification Pipeline** — verify_dapp_skill_verify_dapp, verify_dapp_skill_crowdfund_contract, verify_dapp_skill_live_rpc_read, verify_dapp_skill_wallet_manual_testing [EXTRACTED 1.00]
- **Prepaid top-up to ledger-contract relay to off-chain Neon balance to on-chain payout** — readme_platform_payto, readme_neon_postgres, contract_readme_topup_function, contract_readme_payout_function, readme_wallet_session_auth [INFERRED 0.85]
- **Backend, contributor, and web as three independently deployable pieces** — readme_backend, readme_contributor, readme_web [EXTRACTED 1.00]
- **Ephemeral Docker sandbox, bore tunnel, and password SSH forming the contributor trust boundary** — readme_docker_sandbox, readme_bore_tunnel, readme_ssh_auth [INFERRED 0.85]

## Communities (59 total, 28 thin omitted)

### Community 0 - "Backend Auth & Payout"
Cohesion: 0.05
Nodes (66): main(), addressFromSession(), issueLeaseToken(), issueNonce(), issueSession(), issueWalletNonce(), leaseIdFromAuthHeader(), NonceEntry (+58 more)

### Community 1 - "Web Static Pages (About/Arch/Balance)"
Cohesion: 0.07
Nodes (28): About(), ArchDiagram(), BalanceChart(), Props, Pt, Dashboard(), Props, Docs() (+20 more)

### Community 2 - "Shared Message & Type Contracts"
Cohesion: 0.07
Nodes (28): ActiveComputePoint, AgentHelloMsg, ContainerFailedMsg, ContainerReadyMsg, DestroyContainerMsg, ExplorerNode, HeartbeatMsg, HelloAckMsg (+20 more)

### Community 3 - "Backend Dependencies"
Cohesion: 0.07
Nodes (26): dependencies, cors, dotenv, express, @fallow/shared, jsonwebtoken, nanoid, pg (+18 more)

### Community 4 - "Contributor Docker Sandbox"
Cohesion: 0.15
Nodes (22): main(), containerName(), dockerNcpu(), ensureImage(), execFileP, getFreePort(), runInSandbox(), SandboxEndpoint (+14 more)

### Community 5 - "Web Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, @creit.tech/stellar-wallets-kit, react, react-dom, react-router-dom, @stellar/stellar-sdk, devDependencies, @fallow/shared (+14 more)

### Community 6 - "Ledger Contract Deployment Docs"
Cohesion: 0.11
Nodes (19): Fallow ledger contract (fallow_ledger, Soroban), payout(lease_id, contributor, user, amount) contract function, Platform (custodial) address, Backend/registry production deployment (Docker/PaaS/VPS), npm run keygen (Stellar key generation), DEPLOY.md Known limitations section, Registry environment variables table, SOROBAN_RPC_URL (Soroban RPC endpoint) (+11 more)

### Community 7 - "Contributor Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, dotenv, @fallow/shared, nanoid, socket.io-client, @stellar/stellar-sdk, tsx, devDependencies (+10 more)

### Community 8 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 9 - "Root Package Config"
Cohesion: 0.12
Nodes (16): description, engines, node, name, private, scripts, backend, build:backend (+8 more)

### Community 10 - "Web App Shell & Wallet Context"
Cohesion: 0.23
Nodes (12): Props, WalletBar(), App(), useWallet(), WalletContext, WalletContextValue, WalletProvider(), connectWallet() (+4 more)

### Community 11 - "Metrics & Leaderboard UI"
Cohesion: 0.14
Nodes (9): CONTRIBUTOR_SORTS, fmtDay(), Metrics(), Pt, SORTS, TimeSeriesChart(), ContributorSort, LeaderboardEntry (+1 more)

### Community 12 - "Example-Buyer Dependencies"
Cohesion: 0.13
Nodes (14): dependencies, dotenv, @fallow/shared, @stellar/stellar-sdk, tsx, devDependencies, @types/node, typescript (+6 more)

### Community 13 - "Web API Client"
Cohesion: 0.27
Nodes (13): apiError(), fetchActiveCompute(), fetchContributorLeaderboard(), fetchExplorer(), fetchLeaderboard(), fetchLease(), fetchMyNodes(), fetchPlatform() (+5 more)

### Community 14 - "Shared TS Base Config"
Cohesion: 0.14
Nodes (13): compilerOptions, composite, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+5 more)

### Community 15 - "Ledger Contract (Rust)"
Cohesion: 0.33
Nodes (8): Address, Env, DataKey, FallowLedger, native_token(), platform(), String, TokenClient

### Community 16 - "Shared Package Config"
Cohesion: 0.20
Nodes (10): default, exports, main, name, private, scripts, build, type (+2 more)

### Community 17 - "Web Rental UI (Contribute/Lease)"
Cohesion: 0.27
Nodes (7): Contribute(), fmtCountdown(), LeasePanel(), Props, writeClipboard(), ComputeNode, LeaseStatus

### Community 18 - "Autonomous Buyer Agent"
Cohesion: 0.24
Nodes (9): main(), balanceOf(), LEASE_MINUTES, LedgerClient, MIN_RAM_MB, postJson(), repoRoot, TOPUP_XLM (+1 more)

### Community 19 - "Backend TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 20 - "Contributor TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 21 - "Example-Buyer TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 22 - "Backend Top-up Settlement"
Cohesion: 0.43
Nodes (6): decode(), SettledTopUp, settleTopUp(), soroban, sorobanErrorMessage(), verifyLoginSignature()

### Community 23 - "Hero Art Illustration"
Cohesion: 0.38
Nodes (7): Blue-on-Black Duotone Engraving Style, Gathering Many Streams Into One Point (crowdfunding metaphor), Hero Art Illustration (hero-art.jpg), Serves as Landing-Page Hero Visual for Fallow Web App, Multi-Armed Classical Figure Gathering Rays, Radiating Line Bundles / Starburst Motif, Possible Mythological Wind/Messenger Deity (winged cap)

### Community 24 - "Web Wallet Sign-in & Types"
Cohesion: 0.29
Nodes (6): PlatformInfo, WalletLoginResponse, WalletNonceResponse, LedgerClient, loginWithWallet(), SignXdr

### Community 25 - "Shared TS Config"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 26 - "Stellar Challenge Submission Notes"
Cohesion: 0.50
Nodes (5): Stellar Frontend Challenge (Level 1 - White Belt) Submission, Crowdfund Soroban Contract (deployed on Testnet), Live Soroban RPC Read Check (get_campaign_count simulation), verify-dapp Verification Skill, Manual Wallet-Flow Testing Requirement

### Community 28 - "Docker Compose Services"
Cohesion: 0.50
Nodes (4): buyer service (docker-compose, one-shot), contributor service (docker-compose), Docker socket mount (sibling container launch), REGISTRY_URL

### Community 30 - "Stellar Network Constants"
Cohesion: 0.67
Nodes (3): NATIVE_SAC (native XLM Stellar Asset Contract id constant), NETWORK_PASSPHRASE (Stellar network passphrase), Stellar (blockchain network)

### Community 31 - "Web SPA Deployment Rationale"
Cohesion: 0.67
Nodes (3): Web app (static SPA) deployment, Vite SPA choice rationale: client-only wallet stack avoids SSR/hydration friction, web/ (Vite + React frontend)

## Ambiguous Edges - Review These
- `Multi-Armed Classical Figure Gathering Rays` → `Possible Mythological Wind/Messenger Deity (winged cap)`  [AMBIGUOUS]
  web/public/hero-art.jpg · relation: conceptually_related_to

## Knowledge Gaps
- **251 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+246 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Multi-Armed Classical Figure Gathering Rays` and `Possible Mythological Wind/Messenger Deity (winged cap)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `proratedCost()` connect `Backend Auth & Payout` to `Shared Message & Type Contracts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `WalletSummary` connect `Web Static Pages (About/Arch/Balance)` to `Shared Message & Type Contracts`, `Web API Client`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `apiError()` (e.g. with `loginWithWallet()` and `topUp()`) actually correct?**
  _`apiError()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _254 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend Auth & Payout` be split into smaller, more focused modules?**
  _Cohesion score 0.051228070175438595 - nodes in this community are weakly interconnected._
- **Should `Web Static Pages (About/Arch/Balance)` be split into smaller, more focused modules?**
  _Cohesion score 0.06717687074829932 - nodes in this community are weakly interconnected._