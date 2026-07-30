#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token::TokenClient, Address, Env, String, Symbol};

// Native XLM's Stellar Asset Contract id on testnet — a fixed per-network
// constant (fetched via `stellar contract id asset --asset native --network
// testnet`), not something that changes per deploy. Porting this contract to
// mainnet means rebuilding with mainnet's native SAC id instead.
const NATIVE_SAC: &str = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

#[contracttype]
enum DataKey {
    Platform,
}

fn native_token(env: &Env) -> TokenClient<'_> {
    TokenClient::new(env, &Address::from_string(&String::from_str(env, NATIVE_SAC)))
}

fn platform(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Platform).unwrap()
}

/// Fallow's ledger contract. It never holds a balance itself — `topup` and
/// `payout` are pure relays that move native XLM directly between the caller
/// and the platform's custodial address, each emitting an on-chain event so
/// every top-up and payout is a publicly auditable, distinctly-typed call
/// instead of an anonymous payment.
#[contract]
pub struct FallowLedger;

#[contractimpl]
impl FallowLedger {
    /// Runs once, atomically, as part of `stellar contract deploy -- --platform G...`.
    pub fn __constructor(env: Env, platform: Address) {
        env.storage().instance().set(&DataKey::Platform, &platform);
    }

    /// A user tops up: `amount` of native XLM moves from `from` to the
    /// platform's custodial address. Requires `from`'s authorization.
    pub fn topup(env: Env, from: Address, amount: i128) {
        from.require_auth();
        native_token(&env).transfer(&from, &platform(&env), &amount);
        env.events().publish((Symbol::new(&env, "topup"),), (from, amount));
    }

    /// The backend releases a lease and pays the contributor their cut:
    /// `amount` of native XLM moves from the platform's custodial address to
    /// `contributor`. Requires the platform's authorization (the backend
    /// signs with `PLATFORM_PRIVATE_KEY`).
    pub fn payout(env: Env, lease_id: String, contributor: Address, user: Address, amount: i128) {
        let platform = platform(&env);
        platform.require_auth();
        native_token(&env).transfer(&platform, &contributor, &amount);
        env.events().publish(
            (Symbol::new(&env, "payout"),),
            (lease_id, contributor, user, amount),
        );
    }

    /// The custodial address top-ups are sent to and payouts are sent from.
    pub fn get_platform(env: Env) -> Address {
        platform(&env)
    }
}
