# Fallow ledger contract

A thin Soroban contract that stands in for classic Stellar payments on
Fallow's money path. It holds no balance itself — `topup` and `payout` are
pure relays that move native XLM directly between the caller and the
platform's custodial address, each emitting an on-chain event. The point is a
public, auditable ledger: every top-up and payout is a distinctly-typed
contract call instead of an anonymous payment.

- `topup(from, amount)` — `from` must authorize; moves `amount` from `from` to
  the platform address. Called by a user's wallet when they top up.
- `payout(lease_id, contributor, user, amount)` — the platform must authorize;
  moves `amount` from the platform address to `contributor`. Called by the
  backend (signs with `PLATFORM_PRIVATE_KEY`) when a lease ends.
- `get_platform()` — read-only, returns the custodial address in force.

The native XLM Stellar Asset Contract id is compiled in as a constant
(`NATIVE_SAC` in `src/lib.rs`) — it's a fixed per-network value, fetched via
`stellar contract id asset --asset native --network testnet`. Porting to
mainnet means rebuilding with mainnet's native SAC id.

## Deployed (testnet)

- Contract ID: `CC2ISLGUZEIM37F7D7PNXOC2YVCPBN2TVDRYN4DBL7FCT3N2VYKN4ZIA`
- Explorer: https://stellar.expert/explorer/testnet/contract/CC2ISLGUZEIM37F7D7PNXOC2YVCPBN2TVDRYN4DBL7FCT3N2VYKN4ZIA
- Platform (custodial) address: `GAOQRULRA3NCUQNFG55LXALEP5SGUIU7L6KG3UTGH3WOUPU2ZK67LXE6`

## Build & deploy (redeploying fresh)

```bash
# One-off: a throwaway identity to pay deployment fees, and the platform
# identity that becomes the contract's custodial authority.
stellar keys generate deployer --network testnet --fund
stellar keys generate platform --network testnet --fund

stellar contract build

stellar contract deploy \
  --wasm target/wasm32v1-none/release/fallow_ledger.wasm \
  --source deployer --network testnet \
  -- --platform "$(stellar keys address platform)"
# → prints the new Contract ID; put it in CONTRACT_ID (root .env)

# Sanity check:
stellar contract invoke --id <CONTRACT_ID> --source deployer --network testnet -- get_platform
```

`platform`'s secret key becomes `PLATFORM_PRIVATE_KEY`, its address becomes
`PLATFORM_PAYTO` — same custodial role it plays without the contract, just
invoked through `topup`/`payout` now instead of a direct classic payment.
