# Fallow — Whitepaper

**A prepaid compute marketplace for individual contributors, metered in native XLM on Stellar.**

*Testnet submission — Stellar frontend challenge (Level 1, White Belt). Last updated 2026-07-31.*

This document is the evaluator-facing writeup: what Fallow is, why it's built the way it is, the
exact math behind billing, the custodial tradeoff it makes today and what that would take to
remove, and a roadmap. For setup and API details, see [README.md](./README.md) and
[DEPLOY.md](./DEPLOY.md).

---

## 1. What Fallow is

Akash and io.net let *data centers* rent out spare compute. Fallow does the same thing for
*individuals* — anyone with a spare PC, gaming rig, or GPU box can list it, and anyone (human or
autonomous agent) can rent it by the hour, paying in native XLM with no per-action wallet prompts
after the initial top-up.

The flow in one sentence: a renter tops up a prepaid balance once, rents a node, gets a sandboxed
SSH session billed by the hour and charged once when they release it; the contributor is paid
on-chain when the lease ends, minus a small platform fee.

Three pieces talk to one central registry: a **contributor** daemon (advertises specs, launches
sandboxes), the **registry** (Express + Socket.IO + Neon Postgres — matches renters to nodes,
meters usage, settles payment), and a **consumer** (a person in the web UI, or a headless agent
hitting two HTTP endpoints). A Soroban **ledger contract** relays every top-up and payout so the
money movement is publicly auditable, not just a line in a database.

---

## 2. The trust model

The question a contributor has to answer before running this on their own machine: *what can a
stranger who rents my box actually do to it?* Fallow's answer isn't a permissions system layered
on top of a shared OS — it's that the renter never touches the host at all. Every lease is a
throwaway container with the host's attack surface removed before the renter's first packet
arrives:

- **No host filesystem exposure.** The sandbox is launched with no `-v` mounts of any kind. There
  is nothing on the host's disk for a renter to reach.
- **No inbound port on the contributor's machine.** The sandbox dials *out* to a public
  [bore](https://github.com/ekzhang/bore) relay for its SSH endpoint (`TUNNEL_MODE=bore`, the
  default). The contributor's firewall stays exactly as closed as it was before. The alternative,
  `TUNNEL_MODE=local`, publishes SSH to `127.0.0.1` only, for the case where renter and
  contributor share a machine.
- **Nearly every Linux capability dropped.** The container starts with `--cap-drop ALL`, then adds
  back exactly seven: `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `SETUID`, `SETGID`, `SYS_CHROOT`,
  `AUDIT_WRITE` — the minimum sshd needs to run a privilege-separated root login. `SYS_CHROOT`
  specifically: without it sshd accepts the TCP connection and then silently drops it before the
  banner, which is why it's on the list rather than omitted for extra caution.
  `--security-opt no-new-privileges` blocks any setuid-escalation path even within that reduced
  capability set.
- **Hard resource ceilings.** `--memory`, `--memory-swap` (pinned equal to `--memory`, so there's
  no swap-based escape from the cap), `--cpus`, and `--pids-limit 256` are all cgroup-enforced, not
  advisory.
- **Destroyed on release, unconditionally.** `--rm` plus an explicit `docker rm -f` when the lease
  ends (release, balance exhaustion, or registry-side teardown). There is no persistent state
  between leases for a renter to inherit or leave behind.

This is the same containerization trade-off the entire DePIN-compute sector already runs
production traffic on (Akash, io.net, Vast.ai all isolate at the container or VM boundary, not the
OS-permission boundary) — Fallow doesn't invent a new safety model, it applies the existing one at
individual-hardware scale.

**What this model doesn't cover:** a contributor is still trusting the *image* they run
(`contributor/sandbox-ssh`, built from source they control) and the Docker daemon itself. A kernel
or Docker-engine container-escape vulnerability is out of scope for an application-layer safety
model — that's true of every container-based compute marketplace, not a Fallow-specific gap.

---

## 3. Billing math

Nodes are priced by their contributor in **USD per hour** (`PRICE_PER_HOUR_USD`). Everything after
that is a fixed conversion chain, in `shared/src/index.ts`:

```
usdToStroops(usd, xlmUsdPrice)      = round((usd / xlmUsdPrice) * 1e7)
stroopsPerHour(usdPerHour, price)   = usdToStroops(usdPerHour, price)
proratedCost(rateStroopsPerHour, s) = round((s / 3600) * rateStroopsPerHour)
```

`xlmUsdPrice` (`XLM_USD_PRICE`, a registry env var, default `0.11`) is a **static rate** today, not
a live price feed — see §6. `1e7` is stroops-per-XLM (Stellar's native fixed-point: 1 XLM =
10,000,000 stroops).

**Worked example.** A node priced at `$2.00/hr`, with `XLM_USD_PRICE=0.11`:

```
stroopsPerHour = round((2.00 / 0.11) * 1e7) = 181,818,181 stroops/hr  (≈ 18.18 XLM/hr)
```

Rent it for 47 minutes (2,820 seconds) and release:

```
proratedCost = round((2820 / 3600) * 181,818,181) = 142,975,206 stroops  (≈ 14.30 XLM)
```

That's the *only* debit for the whole session — there is no per-minute or per-tick charge.

**Why bill once, at the end, instead of metering continuously.** Two things make continuous
metering unnecessary complexity here: usage is already tracked continuously in memory
(`startedAt` on the in-memory `Lease`), so the exact billed duration is always available without a
running total; and every intermediate charge would be a Postgres write on a hot path that doesn't
need one. Billing once collapses "meter continuously, debit continuously" into "meter
continuously, debit once" — same accuracy, one write instead of N.

**The one thing bill-once needs, and how it's bounded.** If nothing checked in between, a renter
whose balance ran out mid-session could keep the sandbox alive indefinitely and get billed a debt
the platform then has to eat (balances are clamped to zero, never negative — see `debitWallet` in
`backend/src/db.ts`). The watchdog exists exactly for this: at rent time, the registry computes

```
expiresAt = now + (balance / rateStroopsPerHour) * 3,600,000 ms
```

— literally "how many hours does the current balance afford at this node's rate" — and a timer
(`METER_INTERVAL_MS`, default 10,000 ms) checks every active lease against `expiresAt`, ending and
billing any lease that's past it. **Worst-case free usage is therefore bounded by one watchdog
tick** (default: ≤10 seconds of compute the platform doesn't collect on), not by the length of the
session. That bound is a deliberate, sized trade: tightening `METER_INTERVAL_MS` shrinks it at the
cost of more frequent lease scans; it does not require touching the billing model itself.

**Contributor payout.** At lease end, the charged amount splits by `PLATFORM_FEE_PCT` (default
`10`):

```
fee            = floor(charged * platformFeePct / 100)
contributorCut = charged - fee
```

`contributorCut` is paid on-chain immediately (via the ledger contract's `payout(...)`, §5) — the
contributor is never waiting on a batch payout job or a withdrawal request.

---

## 4. The custodial tradeoff

**What's custodial today.** Every top-up moves XLM to one address the platform's operator
controls (`PLATFORM_PAYTO`, signed by `PLATFORM_PRIVATE_KEY`). The renter's *spendable balance* is
an off-chain integer in Neon Postgres, credited when a `topup()` call confirms on-chain
(idempotent per transaction id — replaying the same deposit can't double-credit) and debited once
at lease end. There is currently **no on-chain path for a renter to withdraw unused balance** —
the only outbound flow from the custodial address is a contributor payout.

**Why build it this way for a testnet submission, instead of non-custodial from day one.** A
non-custodial design needs one of two things, and both are real scope beyond a Level 1 submission:
(a) a *payment channel or escrow contract* that locks a renter's deposit and releases it to the
contributor incrementally as usage accrues, needing on-chain state per active lease and a dispute
path for disagreements about billed duration; or (b) *streaming payments* (Stellar doesn't have
native payment streaming — this would mean a custom Soroban contract tracking a per-second accrual
rate per lease, closed out at release). Either one turns "watchdog checks a timestamp" into
"watchdog submits an on-chain transaction," which reintroduces exactly the kind of per-tick
on-chain write the billing model in §3 is deliberately built to avoid, and adds a contract-level
dispute-resolution problem (what happens when the registry and the contract disagree about elapsed
time?) that a custodial ledger sidesteps entirely.

**What moving toward non-custodial actually looks like, and what step is already taken.** The
honest framing isn't "custodial vs. not" as a binary, it's a gradient of what's verifiable
on-chain vs. trusted off-chain. Fallow already took the first step: instead of `topup`/`payout`
being anonymous classic payments indistinguishable from any other transfer, both go through a
Soroban **ledger contract** (§5) that holds no balance itself but makes every deposit and every
payout a distinctly-typed, publicly logged event. That doesn't remove custody of the *resting*
balance between top-up and spend — it removes the ability to move money through this system
*without leaving a public record of it*. The next real step past that is a withdrawal path: a
`withdraw(to, amount)` contract call, authorized by the renter, that lets an unspent balance flow
back out of `PLATFORM_PAYTO` without contributor mediation. That's scoped for the roadmap (§6), not
built yet — it needs the registry to attest to a specific renter's off-chain balance in a way the
contract can verify without simply trusting the registry's signature, which is a small but real
design problem (a signed balance attestation with a nonce/expiry is the likely shape).

**Practical exposure today.** `PLATFORM_PRIVATE_KEY` custodies every renter's prepaid balance *and*
signs every contributor payout — it's the single highest-value secret in the system, by design
(that's what "custodial" means), and the deployment docs call this out explicitly rather than
softening it.

---

## 5. The ledger contract

`contract/src/lib.rs` — a small Soroban contract, deployed on testnet at
[`CC2ISLGUZEIM37F7D7PNXOC2YVCPBN2TVDRYN4DBL7FCT3N2VYKN4ZIA`](https://stellar.expert/explorer/testnet/contract/CC2ISLGUZEIM37F7D7PNXOC2YVCPBN2TVDRYN4DBL7FCT3N2VYKN4ZIA).
Four functions, no storage besides the platform address set once at deploy:

| Function | Caller | What it does |
|---|---|---|
| `__constructor(platform)` | deployer, once | stores the custodial address, atomically at deploy |
| `topup(from, amount)` | the renter's wallet | `from.require_auth()`, relays `amount` native XLM from `from` to the platform address, emits a public `topup` event |
| `payout(lease_id, contributor, user, amount)` | the registry (signs with `PLATFORM_PRIVATE_KEY`) | requires the platform's auth, relays `amount` from the platform address to `contributor`, emits a public `payout` event carrying `lease_id` and `user` |
| `get_platform()` | anyone | read-only, returns the custodial address in force |

The contract **holds no balance at any point** — every call is a same-transaction relay between
two existing accounts, using the native asset's Stellar Asset Contract under the hood
(`TokenClient::transfer`). What it buys over a plain classic payment: every top-up and payout is
now a distinctly-typed, argument-carrying, publicly queryable event instead of an anonymous
transfer indistinguishable from any other payment on the network — you can point at
`stellar.expert` and show *exactly* which transactions were Fallow top-ups and payouts, and which
lease each payout belonged to, without trusting Fallow's own database to tell you the truth.

---

## 6. Roadmap

Everything below is **proposed, not built** — stated here so an evaluator can see the intended
trajectory, not as a commitment or timeline.

**Near-term (extends the current architecture, no redesign):**
- **Renter withdrawal path.** A `withdraw(to, amount)` contract call closing the non-custodial gap
  described in §4 — the largest single trust improvement available without a full redesign.
- **Live XLM/USD price feed.** Replace the static `XLM_USD_PRICE` with a Soroban oracle read (or a
  signed off-chain feed) so pricing tracks the market instead of a config value an operator has to
  remember to update.
- **Registry high availability.** Nodes and leases are deliberately in-memory (keeps Postgres off
  the heartbeat/watchdog hot path — see README's "Notes & limitations"), which means a registry
  restart drops live sessions. Externalizing that state (e.g. a Socket.IO Redis adapter + a shared
  lease store) removes the single-instance ceiling without touching the billing model.
- **Key-based SSH.** Today's per-lease password (the renter's wallet address, on a throwaway root
  container) is fine for ephemeral compute but not a real credential. An ephemeral keypair injected
  per lease is a bounded, well-understood upgrade.

**Medium-term (larger scope, may need contract or protocol changes):**
- **Mainnet.** Everything here targets testnet; a mainnet move means re-auditing the custodial key
  handling, the contract's native-SAC constant (network-specific, see `contract/README.md`), and
  the fee economics against real XLM prices.
- **Reputation / uptime scoring for contributors**, surfaced next to the leaderboard's "time served"
  and "times served" metrics (already live — see the Metrics page) — a natural extension once
  there's enough lease history to make a score meaningful.
- **Streaming settlement**, if the incremental-payout design from §4 turns out to need it —
  evaluated only after the withdrawal path ships, not before.

---

## 7. Known limitations (unchanged from today, stated plainly)

- Custodial resting balance; no renter withdrawal path yet (§4).
- `XLM_USD_PRICE` is static, not a live feed.
- Nodes/leases are in-memory; a registry restart drops live sessions.
- SSH auth is a password (the renter's wallet address), not a key.
- A single registry instance owns the WebSocket hub and in-memory state — no horizontal scale yet.
- The public `bore.pub` relay is best-effort; production deployments should self-host `bore server`.

None of these are hidden in the code — every one is called out at the point in the codebase it
applies (`db.ts`, `config.ts`, `DEPLOY.md`'s "Known limitations" section) and repeated here so the
evaluator-facing document says the same thing the code comments say.
