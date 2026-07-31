# Graph Report - .  (2026-07-31)

## Corpus Check
- Corpus is ~42,486 words - fits in a single context window. You may not need a graph.

## Summary
- 574 nodes · 845 edges · 57 communities (35 shown, 22 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Project Docs & Deployment|Project Docs & Deployment]]
- [[_COMMUNITY_Dashboard & Balance Chart|Dashboard & Balance Chart]]
- [[_COMMUNITY_Landing & Static Pages|Landing & Static Pages]]
- [[_COMMUNITY_Backend Package Manifest|Backend Package Manifest]]
- [[_COMMUNITY_Contributor Sandbox Runtime|Contributor Sandbox Runtime]]
- [[_COMMUNITY_Shared Protocol Types|Shared Protocol Types]]
- [[_COMMUNITY_Web Package Manifest|Web Package Manifest]]
- [[_COMMUNITY_Web API Client|Web API Client]]
- [[_COMMUNITY_Contributor Package Manifest|Contributor Package Manifest]]
- [[_COMMUNITY_Node Registry & Heartbeats|Node Registry & Heartbeats]]
- [[_COMMUNITY_Web TypeScript Config|Web TypeScript Config]]
- [[_COMMUNITY_Root Workspace Scripts|Root Workspace Scripts]]
- [[_COMMUNITY_Auth Tokens & Nonces|Auth Tokens & Nonces]]
- [[_COMMUNITY_Lease Billing & Payout|Lease Billing & Payout]]
- [[_COMMUNITY_Metrics & Leaderboards UI|Metrics & Leaderboards UI]]
- [[_COMMUNITY_Example-Buyer Manifest|Example-Buyer Manifest]]
- [[_COMMUNITY_Base TypeScript Config|Base TypeScript Config]]
- [[_COMMUNITY_Soroban Ledger Contract|Soroban Ledger Contract]]
- [[_COMMUNITY_Shared Package Manifest|Shared Package Manifest]]
- [[_COMMUNITY_Autonomous Buyer Agent|Autonomous Buyer Agent]]
- [[_COMMUNITY_Wallet Database Layer|Wallet Database Layer]]
- [[_COMMUNITY_Metrics SQL Queries|Metrics SQL Queries]]
- [[_COMMUNITY_Package TS Config A|Package TS Config A]]
- [[_COMMUNITY_Package TS Config B|Package TS Config B]]
- [[_COMMUNITY_Package TS Config C|Package TS Config C]]
- [[_COMMUNITY_Backend Entrypoint & Bootstrap|Backend Entrypoint & Bootstrap]]
- [[_COMMUNITY_Stellar Wallet Verification|Stellar Wallet Verification]]
- [[_COMMUNITY_Hero Art Illustration|Hero Art Illustration]]
- [[_COMMUNITY_Web Wallet Login Client|Web Wallet Login Client]]
- [[_COMMUNITY_Contract TS Config|Contract TS Config]]
- [[_COMMUNITY_Challenge Submission Notes|Challenge Submission Notes]]
- [[_COMMUNITY_Explore Marketplace UI|Explore Marketplace UI]]
- [[_COMMUNITY_Contract Deployment Setup|Contract Deployment Setup]]
- [[_COMMUNITY_Contributor Config|Contributor Config]]
- [[_COMMUNITY_Docker Compose Services|Docker Compose Services]]
- [[_COMMUNITY_Backend Config|Backend Config]]
- [[_COMMUNITY_Fallow Brand Assets|Fallow Brand Assets]]
- [[_COMMUNITY_Container Entrypoint Script|Container Entrypoint Script]]
- [[_COMMUNITY_Keygen Script|Keygen Script]]
- [[_COMMUNITY_Deployed Contract ID|Deployed Contract ID]]
- [[_COMMUNITY_get_platform Contract Read|get_platform Contract Read]]
- [[_COMMUNITY_Native XLM Asset Constant|Native XLM Asset Constant]]
- [[_COMMUNITY_payout Contract Function|payout Contract Function]]
- [[_COMMUNITY_Platform Custodial Address|Platform Custodial Address]]
- [[_COMMUNITY_topup Contract Function|topup Contract Function]]
- [[_COMMUNITY_Contributor Agent Deploy|Contributor Agent Deploy]]
- [[_COMMUNITY_Stellar Keygen Command|Stellar Keygen Command]]
- [[_COMMUNITY_Stellar Network Passphrase|Stellar Network Passphrase]]
- [[_COMMUNITY_Production Checklist|Production Checklist]]
- [[_COMMUNITY_Static SPA Deployment|Static SPA Deployment]]
- [[_COMMUNITY_Backend Compose Service|Backend Compose Service]]
- [[_COMMUNITY_Web Not Dockerized Note|Web Not Dockerized Note]]
- [[_COMMUNITY_Google Fonts Loading|Google Fonts Loading]]
- [[_COMMUNITY_Web Entry Script|Web Entry Script]]
- [[_COMMUNITY_Root Mount Div|Root Mount Div]]
- [[_COMMUNITY_Page Title Branding|Page Title Branding]]

## God Nodes (most connected - your core abstractions)
1. `formatXlmShort()` - 16 edges
2. `apiError()` - 16 edges
3. `formatXlm()` - 15 edges
4. `compilerOptions` - 15 edges
5. `compilerOptions` - 13 edges
6. `WalletSummary` - 11 edges
7. `startSandbox()` - 10 edges
8. `ActiveLease` - 10 edges
9. `scripts` - 9 edges
10. `endLeaseAndBill()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `DEPLOY.md Known limitations section` --semantically_similar_to--> `Custodial Model Limitation`  [INFERRED] [semantically similar]
  DEPLOY.md → README.md
- `Balance Clamped to Zero (debitWallet)` --semantically_similar_to--> `Prepaid Off-Chain Balance`  [INFERRED] [semantically similar]
  WHITEPAPER.md → README.md
- `Container Trust Model (§2)` --semantically_similar_to--> `Ephemeral Docker Sandbox Trust Model`  [INFERRED] [semantically similar]
  WHITEPAPER.md → README.md
- `Contributor / Registry / Consumer Architecture` --semantically_similar_to--> `backend/ Registry and API`  [INFERRED] [semantically similar]
  WHITEPAPER.md → README.md
- `Soroban Ledger Contract (§5)` --semantically_similar_to--> `Fallow Ledger Contract (README)`  [INFERRED] [semantically similar]
  WHITEPAPER.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **verify-dapp Verification Pipeline** — verify_dapp_skill_verify_dapp, verify_dapp_skill_crowdfund_contract, verify_dapp_skill_live_rpc_read, verify_dapp_skill_wallet_manual_testing [EXTRACTED 1.00]
- **Backend, contributor, and web as three independently deployable pieces** — readme_backend, readme_contributor, readme_web [EXTRACTED 1.00]
- **Fallow npm-Workspaces Monorepo Pieces** — readme_backend_registry, readme_contributor_daemon, readme_web_app, readme_example_buyer, readme_shared_package [EXTRACTED 1.00]
- **Soroban Ledger Contract Function Surface** — whitepaper_contract_constructor, whitepaper_contract_topup, whitepaper_contract_payout, whitepaper_contract_get_platform, whitepaper_ledger_contract [EXTRACTED 1.00]
- **USD-to-Stroops Billing and Metering Flow** — whitepaper_usdtostroops, whitepaper_stroopsperhour, whitepaper_proratedcost, whitepaper_watchdog, whitepaper_bill_once_design, whitepaper_platform_fee_split, whitepaper_debitwallet_clamp [EXTRACTED 1.00]

## Communities (57 total, 22 thin omitted)

### Community 0 - "Project Docs & Deployment"
Cohesion: 0.05
Nodes (55): Autonomous consumer agent deployment, DEPLOY.md — Setup & Deployment guide, DEPLOY.md Known limitations section, Agentic Endpoints (/explorer, /rent/:nodeId), backend/ Registry and API, Bore Tunnel SSH Exposure, contributor/ Daemon, Custodial Model Limitation (+47 more)

### Community 1 - "Dashboard & Balance Chart"
Cohesion: 0.08
Nodes (36): BalanceChart(), Props, Pt, Dashboard(), Props, xlmStat(), Explore(), Props (+28 more)

### Community 2 - "Landing & Static Pages"
Cohesion: 0.09
Nodes (20): About(), ArchDiagram(), Docs(), HashHero(), HashHeroProps, ROWS, ContributorLeaderboard(), Leaderboard() (+12 more)

### Community 3 - "Backend Package Manifest"
Cohesion: 0.07
Nodes (26): dependencies, cors, dotenv, express, @fallow/shared, jsonwebtoken, nanoid, pg (+18 more)

### Community 4 - "Contributor Sandbox Runtime"
Cohesion: 0.15
Nodes (22): main(), containerName(), dockerNcpu(), ensureImage(), execFileP, getFreePort(), runInSandbox(), SandboxEndpoint (+14 more)

### Community 5 - "Shared Protocol Types"
Cohesion: 0.09
Nodes (22): AgentHelloMsg, ContainerFailedMsg, ContainerReadyMsg, DestroyContainerMsg, HeartbeatMsg, HelloAckMsg, Job, JobResultMsg (+14 more)

### Community 6 - "Web Package Manifest"
Cohesion: 0.09
Nodes (22): dependencies, @creit.tech/stellar-wallets-kit, react, react-dom, react-router-dom, @stellar/stellar-sdk, devDependencies, @fallow/shared (+14 more)

### Community 7 - "Web API Client"
Cohesion: 0.16
Nodes (18): Contribute(), addressQuery(), apiError(), fetchActiveCompute(), fetchContributorLeaderboard(), fetchLeaderboard(), fetchMyNodes(), fetchUserGrowth() (+10 more)

### Community 8 - "Contributor Package Manifest"
Cohesion: 0.11
Nodes (18): dependencies, dotenv, @fallow/shared, nanoid, socket.io-client, @stellar/stellar-sdk, tsx, devDependencies (+10 more)

### Community 9 - "Node Registry & Heartbeats"
Cohesion: 0.13
Nodes (17): verifyAgentHello(), isOnline(), getNode(), listNodesByOwner(), listOnlineNodes(), markOffline(), nodes, touchHeartbeat() (+9 more)

### Community 10 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 11 - "Root Workspace Scripts"
Cohesion: 0.12
Nodes (16): description, engines, node, name, private, scripts, backend, build:backend (+8 more)

### Community 12 - "Auth Tokens & Nonces"
Cohesion: 0.20
Nodes (15): addressFromSession(), issueLeaseToken(), issueNonce(), issueSession(), issueWalletNonce(), leaseIdFromAuthHeader(), NonceEntry, nonces (+7 more)

### Community 13 - "Lease Billing & Payout"
Cohesion: 0.18
Nodes (14): debitWallet(), activateLease(), createLease(), endLeaseAndBill(), leases, leasesForNode(), payoutContributor(), setLeaseStatus() (+6 more)

### Community 14 - "Metrics & Leaderboards UI"
Cohesion: 0.16
Nodes (12): CONTRIBUTOR_SORTS, fmtDay(), formatEntryValue(), LeaderRow(), Pt, short(), SORTS, TimeSeriesChart() (+4 more)

### Community 15 - "Example-Buyer Manifest"
Cohesion: 0.13
Nodes (14): dependencies, dotenv, @fallow/shared, @stellar/stellar-sdk, tsx, devDependencies, @types/node, typescript (+6 more)

### Community 16 - "Base TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, composite, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+5 more)

### Community 17 - "Soroban Ledger Contract"
Cohesion: 0.33
Nodes (8): Address, Env, DataKey, FallowLedger, native_token(), platform(), String, TokenClient

### Community 18 - "Shared Package Manifest"
Cohesion: 0.18
Nodes (11): default, exports, main, name, private, scripts, build, check (+3 more)

### Community 19 - "Autonomous Buyer Agent"
Cohesion: 0.24
Nodes (9): main(), balanceOf(), LEASE_MINUTES, LedgerClient, MIN_RAM_MB, postJson(), repoRoot, TOPUP_XLM (+1 more)

### Community 20 - "Wallet Database Layer"
Cohesion: 0.29
Nodes (9): creditWallet(), getBalance(), getWallet(), pool, q(), recordPayout(), Row, WalletRow (+1 more)

### Community 21 - "Metrics SQL Queries"
Cohesion: 0.29
Nodes (9): activeCompute(), CONTRIBUTOR_BASIS, contributorLeaderboard(), leaderboard(), rankOf(), topN(), USER_BASIS, userGrowth() (+1 more)

### Community 22 - "Package TS Config A"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 23 - "Package TS Config B"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 24 - "Package TS Config C"
Cohesion: 0.25
Nodes (7): compilerOptions, outDir, rootDir, types, extends, include, references

### Community 25 - "Backend Entrypoint & Bootstrap"
Cohesion: 0.43
Nodes (6): main(), initDb(), app, startWatchdog(), router, initWs()

### Community 26 - "Stellar Wallet Verification"
Cohesion: 0.43
Nodes (6): decode(), SettledTopUp, settleTopUp(), soroban, sorobanErrorMessage(), verifyLoginSignature()

### Community 27 - "Hero Art Illustration"
Cohesion: 0.38
Nodes (7): Blue-on-Black Duotone Engraving Style, Gathering Many Streams Into One Point (crowdfunding metaphor), Hero Art Illustration (hero-art.jpg), Serves as Landing-Page Hero Visual for Fallow Web App, Multi-Armed Classical Figure Gathering Rays, Radiating Line Bundles / Starburst Motif, Possible Mythological Wind/Messenger Deity (winged cap)

### Community 28 - "Web Wallet Login Client"
Cohesion: 0.29
Nodes (6): PlatformInfo, WalletLoginResponse, WalletNonceResponse, LedgerClient, loginWithWallet(), SignXdr

### Community 29 - "Contract TS Config"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 30 - "Challenge Submission Notes"
Cohesion: 0.50
Nodes (5): Stellar Frontend Challenge (Level 1 - White Belt) Submission, Crowdfund Soroban Contract (deployed on Testnet), Live Soroban RPC Read Check (get_campaign_count simulation), verify-dapp Verification Skill, Manual Wallet-Flow Testing Requirement

### Community 31 - "Explore Marketplace UI"
Cohesion: 0.40
Nodes (4): SortBy, fetchExplorer(), rentNode(), ExplorerNode

### Community 32 - "Contract Deployment Setup"
Cohesion: 0.40
Nodes (5): Fallow ledger contract (fallow_ledger, Soroban), Backend/registry production deployment (Docker/PaaS/VPS), Registry environment variables table, SOROBAN_RPC_URL (Soroban RPC endpoint), stellar CLI (contract build/deploy tooling)

### Community 34 - "Docker Compose Services"
Cohesion: 0.50
Nodes (4): buyer service (docker-compose, one-shot), contributor service (docker-compose), Docker socket mount (sibling container launch), REGISTRY_URL

## Ambiguous Edges - Review These
- `Nonce-Signed Session Token` → `Renter Withdrawal Path (withdraw)`  [AMBIGUOUS]
  WHITEPAPER.md · relation: conceptually_related_to
- `Multi-Armed Classical Figure Gathering Rays` → `Possible Mythological Wind/Messenger Deity (winged cap)`  [AMBIGUOUS]
  web/public/hero-art.jpg · relation: conceptually_related_to

## Knowledge Gaps
- **248 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+243 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Nonce-Signed Session Token` and `Renter Withdrawal Path (withdraw)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Multi-Armed Classical Figure Gathering Rays` and `Possible Mythological Wind/Messenger Deity (winged cap)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `proratedCost()` connect `Dashboard & Balance Chart` to `Lease Billing & Payout`, `Shared Protocol Types`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `endLeaseAndBill()` connect `Lease Billing & Payout` to `Dashboard & Balance Chart`, `Auth Tokens & Nonces`, `Node Registry & Heartbeats`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `formatXlm()` connect `Dashboard & Balance Chart` to `Autonomous Buyer Agent`, `Shared Protocol Types`, `Metrics & Leaderboards UI`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `apiError()` (e.g. with `loginWithWallet()` and `topUp()`) actually correct?**
  _`apiError()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _251 weakly-connected nodes found - possible documentation gaps or missing edges._