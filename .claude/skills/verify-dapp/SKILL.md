---
name: verify-dapp
description: Verify the Fallow dApp still works after changes — typecheck + production build, lint, and a dev-server smoke test. Use after any change to src/ or config files, or when the user asks to check that nothing is broken.
---

Run the full local verification for this repo, in order. Stop and report at the first failure.

1. **Build (typecheck + bundle):**
   ```sh
   npm run build
   ```
   This runs `next build`, which type-checks (fails on TS errors) and produces the production output. oxlint runs separately (below); Next's own ESLint step is disabled in `next.config.ts`.

2. **Lint:**
   ```sh
   npm run lint
   ```
   oxlint with the repo's `.oxlintrc.json`. The `only-export-components` warning on `src/app/layout.tsx` is a known false positive (Next requires exporting `metadata` beside the layout) — ignore it.

3. **Runtime smoke test:** start the production server (`npm run build` first, then `npm run start`) in the background on a free port, poll it until it responds, then check routes. Middleware only runs under `next start`/`next dev`, so this also exercises the admin gate:
   ```sh
   npm run start -- -p 3010 > /tmp/fallow-next.log 2>&1 & PID=$!
   for i in $(seq 1 40); do curl -sf http://localhost:3010 > /dev/null && break; sleep 0.5; done
   curl -s http://localhost:3010/ | grep -q 'Recent supporters' && echo "tip page OK"
   curl -s -o /dev/null -w "admin redirect=%{http_code}\n" http://localhost:3010/admin  # expect 307 -> /login
   kill $PID
   ```

Wallet-dependent flows (Freighter connect, signing, sending XLM) cannot be verified headlessly — Freighter is a browser extension. If the change touches `src/lib/stellar.ts` or the transaction flow in `src/components/TipJar.tsx`, remind the user to manually test connect → balance → send in a browser with Freighter on Testnet. The admin password gate lives in `src/middleware.ts` + `src/app/api/login`.

Report each step's result plainly: what passed, what failed (with the error output), and whether manual wallet testing is needed.
