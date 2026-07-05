# Graph Report - .  (2026-07-06)

## Corpus Check
- 21 files · ~320,905 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 212 nodes · 340 edges · 14 communities (11 shown, 3 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.82)
- Token cost: 91,159 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Soroban RPC Layer|Soroban RPC Layer]]
- [[_COMMUNITY_Factory Design & Contract API|Factory Design & Contract API]]
- [[_COMMUNITY_Campaign UI Components|Campaign UI Components]]
- [[_COMMUNITY_Soroban Contract (Rust)|Soroban Contract (Rust)]]
- [[_COMMUNITY_Dependencies & Scripts|Dependencies & Scripts]]
- [[_COMMUNITY_Level 1 UI Screenshots|Level 1 UI Screenshots]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Contract Unit Tests|Contract Unit Tests]]
- [[_COMMUNITY_SVG Icon Assets|SVG Icon Assets]]
- [[_COMMUNITY_Lint Config|Lint Config]]
- [[_COMMUNITY_Next.js Root Layout|Next.js Root Layout]]
- [[_COMMUNITY_Home Route|Home Route]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `Crowdfund` - 14 edges
3. `Setup` - 14 edges
4. `Env` - 13 edges
5. `make_campaign()` - 10 edges
6. `Campaign` - 8 edges
7. `Crowdfund Soroban Contract` - 8 edges
8. `u32ScVal()` - 7 edges
9. `createCampaign()` - 7 edges
10. `Fallow — Wallet Connected with Balance & Rejected Tx` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Contract tests (cargo test + stellar contract build)` --references--> `Crowdfund Soroban Contract`  [INFERRED]
  .claude/skills/verify-dapp/SKILL.md → README.md
- `Frontend build (next build typecheck)` --references--> `src/components/Campaign.tsx App shell`  [INFERRED]
  .claude/skills/verify-dapp/SKILL.md → README.md
- `Live RPC read (get_campaign_count simulation)` --references--> `Campaign read getters (get_campaigns/get_campaign/get_campaign_count/get_contribution)`  [INFERRED]
  .claude/skills/verify-dapp/SKILL.md → README.md
- `Live RPC read (get_campaign_count simulation)` --conceptually_related_to--> `Soroban RPC Chain Access`  [INFERRED]
  .claude/skills/verify-dapp/SKILL.md → README.md
- `Fallow — Wallet Connected with Balance & Rejected Tx` --semantically_similar_to--> `Fallow — Before Wallet Connected State`  [INFERRED] [semantically similar]
  screenshots/Balance.png → screenshots/BeforeWalletConneted.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Crowdfunding Escrow Lifecycle** — readme_fn_create_campaign, readme_fn_contribute, readme_fn_withdraw, readme_fn_refund [EXTRACTED 0.90]
- **Frontend Chain-Access Stack** — readme_campaign_tsx, readme_soroban_ts, readme_wallet_ts, readme_config_ts [INFERRED 0.75]
- **dApp Verification Pipeline** — verify_dapp_skill_contract_tests, verify_dapp_skill_frontend_build, verify_dapp_skill_lint, verify_dapp_skill_live_rpc_read [EXTRACTED 0.85]

## Communities (14 total, 3 thin omitted)

### Community 0 - "Soroban RPC Layer"
Cohesion: 0.13
Nodes (28): ActivityEvent, addressScVal(), contract, contribute(), createCampaign(), fundWithFriendbot(), getCampaign(), getCampaignCount() (+20 more)

### Community 1 - "Factory Design & Contract API"
Cohesion: 0.08
Nodes (30): Real-time Activity Feed, Campaign Factory Pattern, src/components/Campaign.tsx App shell, src/lib/config.ts, Crowdfund Soroban Contract, describeError, Three-category Error Handling, On-chain Escrow (+22 more)

### Community 2 - "Campaign UI Components"
Cohesion: 0.12
Nodes (23): App(), CampaignCard(), errorTitle(), eventText(), PHASE_LABEL, timeLeft(), Wallet, APP (+15 more)

### Community 3 - "Soroban Contract (Rust)"
Cohesion: 0.26
Nodes (9): Address, Env, Campaign, Crowdfund, DataKey, Error, String, T (+1 more)

### Community 4 - "Dependencies & Scripts"
Cohesion: 0.09
Nodes (21): dependencies, @creit.tech/stellar-wallets-kit, next, react, react-dom, @stellar/freighter-api, @stellar/stellar-sdk, devDependencies (+13 more)

### Community 5 - "Level 1 UI Screenshots"
Cohesion: 0.14
Nodes (20): Disconnect Wallet Control, Tea Amount Selector (10/30/50 XLM), Transaction Rejected Error State (user rejected request), Fallow — Wallet Connected with Balance & Rejected Tx, Wallet Connected State (address + XLM balance), XLM Balance Display (499.05 XLM), Connect Freighter Wallet Prompt, Wallet Disconnected / Not Connected State (+12 more)

### Community 6 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 7 - "Contract Unit Tests"
Cohesion: 0.29
Nodes (14): Client, Address, Env, CrowdfundClient, backer_refunds_after_failed_deadline(), campaigns_are_independent(), contribute_blocked_after_deadline(), contribute_escrows_and_tracks() (+6 more)

### Community 8 - "SVG Icon Assets"
Cohesion: 0.25
Nodes (8): Favicon (star mark on dark badge), Bluesky Icon, Discord Icon, Documentation Icon, GitHub Icon, Social Icon, Icon Sprite Sheet, X (Twitter) Icon

### Community 9 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

## Knowledge Gaps
- **75 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `Error` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 7 inferred relationships involving `Setup` (e.g. with `backer_refunds_after_failed_deadline()` and `campaigns_are_independent()`) actually correct?**
  _`Setup` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Soroban RPC Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.12873563218390804 - nodes in this community are weakly interconnected._
- **Should `Factory Design & Contract API` be split into smaller, more focused modules?**
  _Cohesion score 0.08045977011494253 - nodes in this community are weakly interconnected._
- **Should `Campaign UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.12315270935960591 - nodes in this community are weakly interconnected._
- **Should `Dependencies & Scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Level 1 UI Screenshots` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._