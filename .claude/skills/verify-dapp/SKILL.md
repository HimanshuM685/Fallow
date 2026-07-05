---
name: verify-dapp
description: Verify the Fallow crowdfunding dApp still works after changes — contract tests, frontend typecheck/build, lint, and a live Soroban RPC read. Use after any change to contract/, src/, or config, or when the user asks to check that nothing is broken.
---

Run verification in order. Stop and report at the first failure.

1. **Contract tests** (only if `contract/` changed):
   ```sh
   cd contract && cargo test && stellar contract build
   ```
   5 unit tests should pass and the WASM should build to `target/wasm32v1-none/release/crowdfund.wasm`.

2. **Frontend build (typecheck + bundle):**
   ```sh
   npm run build
   ```
   Runs `next build` (fails on TS errors). oxlint runs separately; Next's ESLint step is disabled in `next.config.ts`. The `/` route is client-only (`ssr:false`) because it uses wallet extensions.

3. **Lint:**
   ```sh
   npm run lint
   ```
   The `only-export-components` warning on `src/app/layout.tsx` is a known false positive (Next requires exporting `metadata`) — ignore it.

4. **Live RPC read** — confirm the frontend's read path still works against the deployed contract:
   ```sh
   node --input-type=module -e "
   import { Account, BASE_FEE, Contract, Networks, TransactionBuilder, scValToNative, rpc } from '@stellar/stellar-sdk';
   const CONTRACT='CAPBMALOG2MXQZLPWQIVCI65DG74ELN6OG4D7RR7HTYFTZWFA3YBHBDH';
   const ADMIN='GDMFYJCUB23Q7ID26S3KGTRAR2LAQUNDKOQ2IZOAKVRWJ3THTNSHECSQ';
   const server = new rpc.Server('https://soroban-testnet.stellar.org');
   const tx = new TransactionBuilder(new Account(ADMIN,'0'), { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
     .addOperation(new Contract(CONTRACT).call('get_campaign')).setTimeout(30).build();
   const sim = await server.simulateTransaction(tx);
   console.log(rpc.Api.isSimulationError(sim) ? 'ERROR' : scValToNative(sim.result.retval));
   "
   ```
   Should print the campaign struct (goal/raised/donors/admin/deadline).

Wallet-dependent flows (multi-wallet connect, signing, contributing, withdraw/refund) cannot be verified headlessly — wallets are browser extensions. If the change touches `src/lib/soroban.ts`, `src/lib/wallet.ts`, or `src/components/Campaign.tsx`, remind the user to manually test connect → contribute → tx status → live activity in a browser with a wallet on Testnet.

Report each step's result plainly: what passed, what failed (with the error output), and whether manual wallet testing is needed.
