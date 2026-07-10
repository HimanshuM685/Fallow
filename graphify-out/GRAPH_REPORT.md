# Graph Report - .  (2026-07-07)

## Corpus Check
- 21 files · ~326,907 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 198 nodes · 329 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Product Narrative & Screenshots|Product Narrative & Screenshots]]
- [[_COMMUNITY_Campaign UI Components|Campaign UI Components]]
- [[_COMMUNITY_Soroban Contract (Rust)|Soroban Contract (Rust)]]
- [[_COMMUNITY_NPM Dependencies|NPM Dependencies]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Soroban RPC Write Layer|Soroban RPC Write Layer]]
- [[_COMMUNITY_Contract Unit Tests|Contract Unit Tests]]
- [[_COMMUNITY_Soroban RPC Read Layer|Soroban RPC Read Layer]]
- [[_COMMUNITY_Social Icon Assets|Social Icon Assets]]
- [[_COMMUNITY_Wallet Connector|Wallet Connector]]
- [[_COMMUNITY_Lint Config|Lint Config]]
- [[_COMMUNITY_Next.js Root Layout|Next.js Root Layout]]
- [[_COMMUNITY_Home Route|Home Route]]
- [[_COMMUNITY_Brand & Theme Assets|Brand & Theme Assets]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `Crowdfund` - 14 edges
3. `Setup` - 14 edges
4. `Env` - 13 edges
5. `make_campaign()` - 10 edges
6. `Campaign` - 8 edges
7. `u32ScVal()` - 7 edges
8. `createCampaign()` - 7 edges
9. `Address` - 6 edges
10. `CampaignCard()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Contract ID CDAVG46…NR46B on testnet` --semantically_similar_to--> `Deployed testnet contract (CDAVG4…NR46B)`  [INFERRED] [semantically similar]
  screenshots/ContractSS.png → README.md
- `Contract balance: 30 XLM escrowed` --semantically_similar_to--> `On-chain escrow of contributions`  [INFERRED] [semantically similar]
  screenshots/ContractSS.png → README.md
- `Wallet provider list: Freighter, xBull, Albedo, LOBSTR, Rabet` --semantically_similar_to--> `Multi-wallet connect (StellarWalletsKit)`  [INFERRED] [semantically similar]
  screenshots/AllProvidor.png → README.md
- `Call history: create → initialize → create_campaign → contribute` --semantically_similar_to--> `Verifiable contribute tx hash (249515a9…65ecad)`  [INFERRED] [semantically similar]
  screenshots/ContractSS.png → README.md
- `Contribute presets (10 / 50 / 100) + amount field` --conceptually_related_to--> `On-chain escrow of contributions`  [INFERRED]
  screenshots/connected.png → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Level 2 requirements satisfied** — readme_error_handling, readme_tx_status, readme_event_feed, readme_deployed_contract [INFERRED 0.75]

## Communities (16 total, 3 thin omitted)

### Community 0 - "Product Narrative & Screenshots"
Cohesion: 0.08
Nodes (33): No-admin campaign factory, Deployed testnet contract (CDAVG4…NR46B), Three error types handled, On-chain escrow of contributions, Real-time activity via getEvents polling, Fallow — Stellar Crowdfunding factory, Multi-wallet connect (StellarWalletsKit), Soroban RPC chain access (+25 more)

### Community 1 - "Campaign UI Components"
Cohesion: 0.13
Nodes (20): App(), CampaignCard(), errorTitle(), eventText(), PHASE_LABEL, timeLeft(), Wallet, APP (+12 more)

### Community 2 - "Soroban Contract (Rust)"
Cohesion: 0.26
Nodes (9): Address, Env, Campaign, Crowdfund, DataKey, Error, String, T (+1 more)

### Community 3 - "NPM Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, @creit.tech/stellar-wallets-kit, next, react, react-dom, @stellar/freighter-api, @stellar/stellar-sdk, devDependencies (+13 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 5 - "Soroban RPC Write Layer"
Cohesion: 0.17
Nodes (16): contract, contribute(), createCampaign(), i128ScVal(), invoke(), pollTransaction(), RawCampaign, sac (+8 more)

### Community 6 - "Contract Unit Tests"
Cohesion: 0.29
Nodes (14): Client, Address, Env, CrowdfundClient, backer_refunds_after_failed_deadline(), campaigns_are_independent(), contribute_blocked_after_deadline(), contribute_escrows_and_tracks() (+6 more)

### Community 7 - "Soroban RPC Read Layer"
Cohesion: 0.29
Nodes (10): addressScVal(), getCampaign(), getCampaignCount(), getCampaigns(), getContribution(), getXlmBalance(), mapCampaign(), refund() (+2 more)

### Community 8 - "Social Icon Assets"
Cohesion: 0.46
Nodes (8): Icon Sprite Sheet (icons.svg), Bluesky Icon (butterfly logo), Discord Icon (game controller face logo), Documentation Icon (purple stroked document with code angle brackets), GitHub Icon (Octocat mark), Social Icon (purple stroked person with star badge), Social / Community Link Icons, X (Twitter) Icon

### Community 9 - "Wallet Connector"
Cohesion: 0.60
Nodes (5): connectWallet(), disconnectWallet(), ensureInit(), restoreWallet(), signWithWallet()

### Community 10 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 13 - "Brand & Theme Assets"
Cohesion: 1.00
Nodes (3): Dark Theme Palette (#0b0e14 background, #fdda24 accent), Fallow Favicon (yellow four-pointed star on dark rounded square), Four-Pointed Star Glyph (✦) Brand Mark

## Knowledge Gaps
- **66 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `Error` (+61 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 7 inferred relationships involving `Setup` (e.g. with `backer_refunds_after_failed_deadline()` and `campaigns_are_independent()`) actually correct?**
  _`Setup` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Product Narrative & Screenshots` be split into smaller, more focused modules?**
  _Cohesion score 0.07765151515151515 - nodes in this community are weakly interconnected._
- **Should `Campaign UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._