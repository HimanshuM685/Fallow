# Graph Report - .  (2026-07-11)

## Corpus Check
- Corpus is ~34,219 words - fits in a single context window. You may not need a graph.

## Summary
- 451 nodes · 682 edges · 29 communities (24 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.81)
- Token cost: 100,217 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend Auth & Leases|Backend Auth & Leases]]
- [[_COMMUNITY_Web Marketing Pages|Web Marketing Pages]]
- [[_COMMUNITY_Docker Sandbox Runtime|Docker Sandbox Runtime]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Web Dependencies|Web Dependencies]]
- [[_COMMUNITY_Platform Docs & Services|Platform Docs & Services]]
- [[_COMMUNITY_Dashboard & Wallet UI|Dashboard & Wallet UI]]
- [[_COMMUNITY_Contributor Dependencies|Contributor Dependencies]]
- [[_COMMUNITY_Buyer Agent Flow|Buyer Agent Flow]]
- [[_COMMUNITY_Web TypeScript Config|Web TypeScript Config]]
- [[_COMMUNITY_Wallet Connection Layer|Wallet Connection Layer]]
- [[_COMMUNITY_Root Package Scripts|Root Package Scripts]]
- [[_COMMUNITY_Buyer Dependencies|Buyer Dependencies]]
- [[_COMMUNITY_Base TypeScript Config|Base TypeScript Config]]
- [[_COMMUNITY_Shared Package Manifest|Shared Package Manifest]]
- [[_COMMUNITY_Stellar Payments Module|Stellar Payments Module]]
- [[_COMMUNITY_Backend TS Config|Backend TS Config]]
- [[_COMMUNITY_Contributor TS Config|Contributor TS Config]]
- [[_COMMUNITY_Buyer TS Config|Buyer TS Config]]
- [[_COMMUNITY_Hero Art Imagery|Hero Art Imagery]]
- [[_COMMUNITY_Shared TS Config|Shared TS Config]]
- [[_COMMUNITY_Contributor Config Loader|Contributor Config Loader]]
- [[_COMMUNITY_Contributor Sandbox Trust|Contributor Sandbox Trust]]
- [[_COMMUNITY_Tendril Brand Identity|Tendril Brand Identity]]
- [[_COMMUNITY_Buyer Config Loader|Buyer Config Loader]]
- [[_COMMUNITY_Web App Entry|Web App Entry]]
- [[_COMMUNITY_Sandbox Entrypoint Script|Sandbox Entrypoint Script]]
- [[_COMMUNITY_Keypair Generator|Keypair Generator]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `compilerOptions` - 13 edges
3. `apiError()` - 12 edges
4. `WalletSummary` - 11 edges
5. `startSandbox()` - 10 edges
6. `formatXlm()` - 9 edges
7. `endLeaseAndBill()` - 8 edges
8. `scripts` - 8 edges
9. `ActiveLease` - 8 edges
10. `Backend / Registry Service (Express + Neon + socket.io)` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Live Soroban RPC Read Check (get_campaign_count simulation)` --semantically_similar_to--> `Horizon Endpoint (confirm top-ups + send payouts)`  [INFERRED] [semantically similar]
  .claude/skills/verify-dapp/SKILL.md → DEPLOY.md
- `Props` --references--> `WalletSummary`  [EXTRACTED]
  web/src/components/Dashboard.tsx → shared/src/index.ts
- `Props` --references--> `WalletSummary`  [EXTRACTED]
  web/src/components/WalletPanel.tsx → shared/src/index.ts
- `Tendril - Prepaid Compute Marketplace on Stellar` --conceptually_related_to--> `Stellar Frontend Challenge (Level 1 - White Belt) Submission`  [AMBIGUOUS]
  README.md → CLAUDE.local.md
- `main()` --calls--> `formatXlm()`  [EXTRACTED]
  example-buyer/src/index.ts → shared/src/index.ts

## Import Cycles
- 1-file cycle: `contributor/src/index.ts -> contributor/src/index.ts`
- 1-file cycle: `example-buyer/src/index.ts -> example-buyer/src/index.ts`

## Hyperedges (group relationships)
- **Tendril Monorepo Service Architecture** — readme_tendril, readme_backend_registry, readme_contributor_agent, readme_web_app, readme_example_buyer, readme_shared_package [EXTRACTED 1.00]
- **Prepaid XLM Money Flow (top-up, meter, bill once, payout)** — readme_prepaid_balance_model, deploy_platform_account, deploy_horizon, deploy_neon_postgres, readme_billing_model, readme_watchdog, readme_wallet_session_auth [EXTRACTED 1.00]
- **verify-dapp Verification Pipeline** — verify_dapp_skill_verify_dapp, verify_dapp_skill_crowdfund_contract, verify_dapp_skill_live_rpc_read, verify_dapp_skill_wallet_manual_testing [EXTRACTED 1.00]

## Communities (29 total, 5 thin omitted)

### Community 0 - "Backend Auth & Leases"
Cohesion: 0.05
Nodes (66): main(), addressFromSession(), issueLeaseToken(), issueNonce(), issueSession(), issueWalletNonce(), leaseIdFromAuthHeader(), NonceEntry (+58 more)

### Community 1 - "Web Marketing Pages"
Cohesion: 0.09
Nodes (29): About(), ArchDiagram(), Contribute(), Docs(), Explore(), Props, HashHero(), HashHeroProps (+21 more)

### Community 2 - "Docker Sandbox Runtime"
Cohesion: 0.08
Nodes (39): main(), containerName(), dockerNcpu(), ensureImage(), execFileP, getFreePort(), runInSandbox(), SandboxEndpoint (+31 more)

### Community 3 - "Backend Dependencies"
Cohesion: 0.08
Nodes (25): dependencies, cors, dotenv, express, jsonwebtoken, nanoid, pg, socket.io (+17 more)

### Community 4 - "Web Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, @creit.tech/stellar-wallets-kit, react, react-dom, react-router-dom, @stellar/stellar-sdk, devDependencies, @tendril/shared (+14 more)

### Community 5 - "Platform Docs & Services"
Cohesion: 0.10
Nodes (22): Stellar Frontend Challenge (Level 1 - White Belt) Submission, Friendbot Testnet Funding, Horizon Endpoint (confirm top-ups + send payouts), In-Memory Nodes/Leases (deliberate non-persistence), Neon Postgres (money state: wallets, topups, charges, payouts), Platform Custodial Stellar Account (PLATFORM_PAYTO + PLATFORM_PRIVATE_KEY), docker-compose service: backend, docker-compose service: buyer (one-shot, profile-gated) (+14 more)

### Community 6 - "Dashboard & Wallet UI"
Cohesion: 0.12
Nodes (14): BalanceChart(), Props, Pt, Dashboard(), Props, PRESETS, Props, SignXdr (+6 more)

### Community 7 - "Contributor Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, dotenv, nanoid, socket.io-client, @stellar/stellar-sdk, @tendril/shared, tsx, devDependencies (+10 more)

### Community 8 - "Buyer Agent Flow"
Cohesion: 0.14
Nodes (16): main(), balanceOf(), LEASE_MINUTES, MIN_RAM_MB, PlatformInfo, postJson(), repoRoot, RunResponse (+8 more)

### Community 9 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 10 - "Wallet Connection Layer"
Cohesion: 0.23
Nodes (12): Props, WalletBar(), App(), useWallet(), WalletContext, WalletContextValue, WalletProvider(), connectWallet() (+4 more)

### Community 11 - "Root Package Scripts"
Cohesion: 0.12
Nodes (15): description, engines, node, name, private, scripts, backend, build:shared (+7 more)

### Community 12 - "Buyer Dependencies"
Cohesion: 0.13
Nodes (14): dependencies, dotenv, @stellar/stellar-sdk, @tendril/shared, tsx, devDependencies, @types/node, typescript (+6 more)

### Community 13 - "Base TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, composite, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+5 more)

### Community 14 - "Shared Package Manifest"
Cohesion: 0.20
Nodes (9): exports, main, name, private, scripts, build, type, types (+1 more)

### Community 15 - "Stellar Payments Module"
Cohesion: 0.39
Nodes (7): horizon, decode(), horizonErrorMessage(), SettledTopUp, settleTopUp(), verifyLoginSignature(), xlmStringToStroops()

### Community 16 - "Backend TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 17 - "Contributor TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 18 - "Buyer TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 19 - "Hero Art Imagery"
Cohesion: 0.38
Nodes (7): Blue-on-Black Duotone Engraving Style, Gathering Many Streams Into One Point (crowdfunding metaphor), Hero Art Illustration (hero-art.jpg), Serves as Landing-Page Hero Visual for Fallow Web App, Multi-Armed Classical Figure Gathering Rays, Radiating Line Bundles / Starburst Motif, Possible Mythological Wind/Messenger Deity (winged cap)

### Community 20 - "Shared TS Config"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 22 - "Contributor Sandbox Trust"
Cohesion: 0.67
Nodes (4): Bore Tunnel SSH Exposure (dial-out, no inbound ports), docker-compose service: contributor, Contributor Agent Daemon, Ephemeral Docker Sandbox Trust Model

### Community 23 - "Tendril Brand Identity"
Cohesion: 0.67
Nodes (4): Brand Green #0B5D3A, Cream Ink #F4F1EA, Favicon: Tendril Mark (cream serif T on green), Tendril Brand Mark

## Ambiguous Edges - Review These
- `Stellar Frontend Challenge (Level 1 - White Belt) Submission` → `Tendril - Prepaid Compute Marketplace on Stellar`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `Multi-Armed Classical Figure Gathering Rays` → `Possible Mythological Wind/Messenger Deity (winged cap)`  [AMBIGUOUS]
  web/public/hero-art.jpg · relation: conceptually_related_to

## Knowledge Gaps
- **191 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+186 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Stellar Frontend Challenge (Level 1 - White Belt) Submission` and `Tendril - Prepaid Compute Marketplace on Stellar`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Multi-Armed Classical Figure Gathering Rays` and `Possible Mythological Wind/Messenger Deity (winged cap)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `WalletSummary` connect `Web Marketing Pages` to `Buyer Agent Flow`, `Backend Auth & Leases`, `Docker Sandbox Runtime`, `Dashboard & Wallet UI`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `SandboxLimits` connect `Backend Auth & Leases` to `Docker Sandbox Runtime`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `SandboxAccess` connect `Buyer Agent Flow` to `Backend Auth & Leases`, `Web Marketing Pages`, `Docker Sandbox Runtime`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `apiError()` (e.g. with `loginWithWallet()` and `topUp()`) actually correct?**
  _`apiError()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _195 weakly-connected nodes found - possible documentation gaps or missing edges._