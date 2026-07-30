# Graph Report - .  (2026-07-31)

## Corpus Check
- Corpus is ~34,471 words - fits in a single context window. You may not need a graph.

## Summary
- 474 nodes · 671 edges · 27 communities (22 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 98,993 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Web Rental UI (ContributeExplore)|Web Rental UI (Contribute/Explore)]]
- [[_COMMUNITY_Backend Auth & Sessions|Backend Auth & Sessions]]
- [[_COMMUNITY_Project Docs & Deployment Concepts|Project Docs & Deployment Concepts]]
- [[_COMMUNITY_Web Marketing Pages|Web Marketing Pages]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Contributor Docker Sandbox|Contributor Docker Sandbox]]
- [[_COMMUNITY_Web Dependencies|Web Dependencies]]
- [[_COMMUNITY_Contributor Dependencies|Contributor Dependencies]]
- [[_COMMUNITY_Web TypeScript Config|Web TypeScript Config]]
- [[_COMMUNITY_Root Package Config|Root Package Config]]
- [[_COMMUNITY_Example-Buyer Dependencies|Example-Buyer Dependencies]]
- [[_COMMUNITY_Shared TS Base Config|Shared TS Base Config]]
- [[_COMMUNITY_Web Dashboard & Balance UI|Web Dashboard & Balance UI]]
- [[_COMMUNITY_Shared Package Config|Shared Package Config]]
- [[_COMMUNITY_Autonomous Buyer Agent|Autonomous Buyer Agent]]
- [[_COMMUNITY_Web Wallet & Horizon Helpers|Web Wallet & Horizon Helpers]]
- [[_COMMUNITY_Backend TS Config|Backend TS Config]]
- [[_COMMUNITY_Contributor TS Config|Contributor TS Config]]
- [[_COMMUNITY_Example-Buyer TS Config|Example-Buyer TS Config]]
- [[_COMMUNITY_Hero Art Illustration|Hero Art Illustration]]
- [[_COMMUNITY_Shared TS Config|Shared TS Config]]
- [[_COMMUNITY_Contributor Runtime Config|Contributor Runtime Config]]
- [[_COMMUNITY_Backend Runtime Config|Backend Runtime Config]]
- [[_COMMUNITY_Fallow Brand & Favicon|Fallow Brand & Favicon]]
- [[_COMMUNITY_Sandbox Entrypoint Script|Sandbox Entrypoint Script]]
- [[_COMMUNITY_Contributor Keygen|Contributor Keygen]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `compilerOptions` - 13 edges
3. `apiError()` - 12 edges
4. `Backend / Registry service` - 11 edges
5. `startSandbox()` - 10 edges
6. `scripts` - 9 edges
7. `WalletSummary` - 9 edges
8. `endLeaseAndBill()` - 8 edges
9. `formatXlm()` - 8 edges
10. `ActiveLease` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Live Soroban RPC Read Check (get_campaign_count simulation)` --semantically_similar_to--> `Horizon (Stellar API endpoint)`  [INFERRED] [semantically similar]
  .claude/skills/verify-dapp/SKILL.md → DEPLOY.md
- `endLeaseAndBill()` --calls--> `proratedCost()`  [INFERRED]
  backend/src/leases.ts → shared/src/index.ts
- `main()` --calls--> `formatXlm()`  [INFERRED]
  example-buyer/src/index.ts → shared/src/index.ts
- `In-memory nodes/leases` --conceptually_related_to--> `Fallow project overview`  [INFERRED]
  DEPLOY.md → README.md
- `FALLOW page title/branding` --conceptually_related_to--> `Fallow project overview`  [INFERRED]
  web/index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **verify-dapp Verification Pipeline** — verify_dapp_skill_verify_dapp, verify_dapp_skill_crowdfund_contract, verify_dapp_skill_live_rpc_read, verify_dapp_skill_wallet_manual_testing [EXTRACTED 1.00]
- **Three independently deployable services (backend, contributor, web)** — deploy_backend_registry, deploy_contributor_agent, readme_web_folder, docker_compose_backend_service, docker_compose_contributor_service [INFERRED 0.85]
- **Custodial top-up, hold, and payout flow** — deploy_platform_payto, deploy_platform_private_key, deploy_neon_postgres, deploy_horizon, deploy_watchdog [INFERRED 0.85]
- **The two agentic endpoints (explore, rent, top up)** — readme_explorer_endpoint, readme_rent_endpoint, readme_topup_endpoint [EXTRACTED 1.00]

## Communities (27 total, 5 thin omitted)

### Community 0 - "Web Rental UI (Contribute/Explore)"
Cohesion: 0.05
Nodes (61): Contribute(), Props, Explore(), Props, fmtCountdown(), LeasePanel(), Props, Props (+53 more)

### Community 1 - "Backend Auth & Sessions"
Cohesion: 0.06
Nodes (59): main(), addressFromSession(), issueLeaseToken(), issueNonce(), issueSession(), issueWalletNonce(), leaseIdFromAuthHeader(), NonceEntry (+51 more)

### Community 2 - "Project Docs & Deployment Concepts"
Cohesion: 0.05
Nodes (50): Stellar Frontend Challenge (Level 1 - White Belt) Submission, Backend / Registry service, Bill-once, prorated billing model, bore tunnel (SSH exposure), Autonomous consumer agent, Contributor agent, Custodial top-up/payout model, Fallow Deployment Guide (+42 more)

### Community 3 - "Web Marketing Pages"
Cohesion: 0.10
Nodes (19): About(), ArchDiagram(), Docs(), HashHero(), HashHeroProps, ROWS, Marketplace(), Props (+11 more)

### Community 4 - "Backend Dependencies"
Cohesion: 0.07
Nodes (26): dependencies, cors, dotenv, express, @fallow/shared, jsonwebtoken, nanoid, pg (+18 more)

### Community 5 - "Contributor Docker Sandbox"
Cohesion: 0.15
Nodes (22): main(), containerName(), dockerNcpu(), ensureImage(), execFileP, getFreePort(), runInSandbox(), SandboxEndpoint (+14 more)

### Community 6 - "Web Dependencies"
Cohesion: 0.09
Nodes (22): dependencies, @creit.tech/stellar-wallets-kit, react, react-dom, react-router-dom, @stellar/stellar-sdk, devDependencies, @fallow/shared (+14 more)

### Community 7 - "Contributor Dependencies"
Cohesion: 0.11
Nodes (18): dependencies, dotenv, @fallow/shared, nanoid, socket.io-client, @stellar/stellar-sdk, tsx, devDependencies (+10 more)

### Community 8 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 9 - "Root Package Config"
Cohesion: 0.12
Nodes (16): description, engines, node, name, private, scripts, backend, build:backend (+8 more)

### Community 10 - "Example-Buyer Dependencies"
Cohesion: 0.13
Nodes (14): dependencies, dotenv, @fallow/shared, @stellar/stellar-sdk, tsx, devDependencies, @types/node, typescript (+6 more)

### Community 11 - "Shared TS Base Config"
Cohesion: 0.14
Nodes (13): compilerOptions, composite, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+5 more)

### Community 12 - "Web Dashboard & Balance UI"
Cohesion: 0.19
Nodes (7): BalanceChart(), Props, Pt, Dashboard(), Charge, TopUp, WalletStats

### Community 13 - "Shared Package Config"
Cohesion: 0.20
Nodes (10): default, exports, main, name, private, scripts, build, type (+2 more)

### Community 14 - "Autonomous Buyer Agent"
Cohesion: 0.28
Nodes (8): main(), balanceOf(), LEASE_MINUTES, MIN_RAM_MB, postJson(), repoRoot, TOPUP_XLM, TRAINING_SCRIPT

### Community 15 - "Web Wallet & Horizon Helpers"
Cohesion: 0.39
Nodes (7): horizon, decode(), horizonErrorMessage(), SettledTopUp, settleTopUp(), verifyLoginSignature(), xlmStringToStroops()

### Community 16 - "Backend TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 17 - "Contributor TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 18 - "Example-Buyer TS Config"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 19 - "Hero Art Illustration"
Cohesion: 0.38
Nodes (7): Blue-on-Black Duotone Engraving Style, Gathering Many Streams Into One Point (crowdfunding metaphor), Hero Art Illustration (hero-art.jpg), Serves as Landing-Page Hero Visual for Fallow Web App, Multi-Armed Classical Figure Gathering Rays, Radiating Line Bundles / Starburst Motif, Possible Mythological Wind/Messenger Deity (winged cap)

### Community 20 - "Shared TS Config"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

## Ambiguous Edges - Review These
- `Multi-Armed Classical Figure Gathering Rays` → `Possible Mythological Wind/Messenger Deity (winged cap)`  [AMBIGUOUS]
  web/public/hero-art.jpg · relation: conceptually_related_to

## Knowledge Gaps
- **215 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+210 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Multi-Armed Classical Figure Gathering Rays` and `Possible Mythological Wind/Messenger Deity (winged cap)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `proratedCost()` connect `Backend Auth & Sessions` to `Web Rental UI (Contribute/Explore)`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `WalletSummary` connect `Web Rental UI (Contribute/Explore)` to `Web Marketing Pages`, `Web Dashboard & Balance UI`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `apiError()` (e.g. with `loginWithWallet()` and `topUp()`) actually correct?**
  _`apiError()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Backend / Registry service` (e.g. with `backend/ folder (registry service)` and `backend service (docker-compose)`) actually correct?**
  _`Backend / Registry service` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _218 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web Rental UI (Contribute/Explore)` be split into smaller, more focused modules?**
  _Cohesion score 0.05300207039337474 - nodes in this community are weakly interconnected._