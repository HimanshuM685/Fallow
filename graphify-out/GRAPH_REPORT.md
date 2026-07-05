# Graph Report - .  (2026-07-05)

## Corpus Check
- Corpus is ~4,638 words - fits in a single context window. You may not need a graph.

## Summary
- 145 nodes · 160 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Source & Stellar Client|App Source & Stellar Client]]
- [[_COMMUNITY_Wallet & Horizon Concepts|Wallet & Horizon Concepts]]
- [[_COMMUNITY_App TS Compiler Config|App TS Compiler Config]]
- [[_COMMUNITY_Node TS Compiler Config|Node TS Compiler Config]]
- [[_COMMUNITY_Package Manifest & Deps|Package Manifest & Deps]]
- [[_COMMUNITY_dApp Verification Workflow|dApp Verification Workflow]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Social Link Icons|Social Link Icons]]
- [[_COMMUNITY_Oxlint Configuration|Oxlint Configuration]]
- [[_COMMUNITY_Landing Hero Visuals|Landing Hero Visuals]]
- [[_COMMUNITY_Vite & Dark-Mode Theming|Vite & Dark-Mode Theming]]
- [[_COMMUNITY_Brand Identity & Favicon|Brand Identity & Favicon]]
- [[_COMMUNITY_Root TS Config|Root TS Config]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 15 edges
3. `Fallow — Stellar Testnet Tip Jar` - 6 edges
4. `Icon Sprite Sheet (icons.svg)` - 6 edges
5. `scripts` - 5 edges
6. `shortAddress()` - 5 edges
7. `Social / Community Link Icons` - 5 edges
8. `Fallow dApp Verification Workflow` - 4 edges
9. `src/lib/stellar.ts (Horizon client: balance fetch, Friendbot, payment build/sign/submit)` - 4 edges
10. `rules` - 3 edges

## Surprising Connections (you probably didn't know these)
- `index.html (Vite HTML entry)` --references--> `Fallow — Stellar Testnet Tip Jar`  [EXTRACTED]
  index.html → README.md
- `src/main.tsx (React entry point)` --shares_data_with--> `#root Mount Point`  [INFERRED]
  README.md → index.html
- `index.html (Vite HTML entry)` --references--> `src/main.tsx (React entry point)`  [EXTRACTED]
  index.html → README.md
- `TipJar()` --calls--> `shortAddress()`  [EXTRACTED]
  src/TipJar.tsx → src/lib/stellar.ts
- `Admin()` --calls--> `shortAddress()`  [EXTRACTED]
  src/Admin.tsx → src/lib/stellar.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local Verification Pipeline (build, lint, smoke test)** — verify_dapp_skill_build_step, verify_dapp_skill_lint_step, verify_dapp_skill_smoke_test_step [EXTRACTED 1.00]
- **XLM Payment Pipeline: build with TransactionBuilder, sign via Freighter, submit to Horizon** — fallow_readme_stellar_sdk_package, fallow_readme_freighter_wallet, fallow_readme_horizon_testnet, fallow_readme_xlm_payment_flow [EXTRACTED 1.00]
- **Frontend Composition: App.tsx UI, stellar.ts client, main.tsx entry mounted via index.html** — fallow_readme_src_app, fallow_readme_lib_stellar, fallow_readme_src_main, fallow_index_html [EXTRACTED 1.00]

## Communities (14 total, 1 thin omitted)

### Community 0 - "App Source & Stellar Client"
Cohesion: 0.13
Nodes (18): describeHorizonError(), Donation, fetchDonations(), fetchXlmBalance(), fundWithFriendbot(), PaymentResult, sendXlmPayment(), server (+10 more)

### Community 1 - "Wallet & Horizon Concepts"
Cohesion: 0.11
Nodes (20): index.html (Vite HTML entry), #root Mount Point, Horizon Result Code Translation, Fallow — Stellar Testnet Tip Jar, @stellar/freighter-api, Freighter Wallet, Friendbot Funding, Horizon Testnet API (+12 more)

### Community 2 - "App TS Compiler Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 3 - "Node TS Compiler Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 4 - "Package Manifest & Deps"
Cohesion: 0.13
Nodes (14): dependencies, react, react-dom, @stellar/freighter-api, @stellar/stellar-sdk, name, private, scripts (+6 more)

### Community 5 - "dApp Verification Workflow"
Cohesion: 0.20
Nodes (12): src/App.tsx transaction flow, Build Step (typecheck + bundle), Freighter/Testnet Manual Testing Caveat, Lint Step, npm run build (tsc -b + vite build), npm run dev (dev server), npm run lint (oxlint), .oxlintrc.json config (+4 more)

### Community 6 - "Dev Dependencies"
Cohesion: 0.25
Nodes (8): devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react

### Community 7 - "Social Link Icons"
Cohesion: 0.46
Nodes (8): Icon Sprite Sheet (icons.svg), Bluesky Icon (butterfly logo), Discord Icon (game controller face logo), Documentation Icon (purple stroked document with code angle brackets), GitHub Icon (Octocat mark), Social Icon (purple stroked person with star badge), Social / Community Link Icons, X (Twitter) Icon

### Community 8 - "Oxlint Configuration"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 9 - "Landing Hero Visuals"
Cohesion: 0.67
Nodes (4): Hero Illustration (Layered Isometric Slabs), Landing Page Hero Section, Layered Platform Motif, Purple Brand Accent Color

### Community 10 - "Vite & Dark-Mode Theming"
Cohesion: 0.67
Nodes (3): Dark Mode Theming (prefers-color-scheme), Vite Build Tool, Vite Logo (SVG)

### Community 11 - "Brand Identity & Favicon"
Cohesion: 1.00
Nodes (3): Dark Theme Palette (#0b0e14 background, #fdda24 accent), Fallow Favicon (yellow four-pointed star on dark rounded square), Four-Pointed Star Glyph (✦) Brand Mark

## Knowledge Gaps
- **73 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev Dependencies` to `Package Manifest & Deps`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Source & Stellar Client` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `Wallet & Horizon Concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.11052631578947368 - nodes in this community are weakly interconnected._
- **Should `App TS Compiler Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Node TS Compiler Config` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Package Manifest & Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._