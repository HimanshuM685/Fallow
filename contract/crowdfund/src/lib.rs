#![no_std]

//! Crowdfunding escrow contract.
//!
//! Donors `contribute` native XLM (via the Stellar Asset Contract) into this
//! contract, which holds the funds. When the goal is reached the `admin` can
//! `withdraw`. If the deadline passes without the goal being met, donors can
//! `refund` their own contribution. State is readable through `get_campaign`
//! and `get_contribution`; every state change emits an event so the frontend
//! can keep a live progress bar in sync.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env,
};

// Extend stored state TTL by ~30 days worth of ledgers on each write so a
// testnet campaign doesn't get archived mid-demo (5s ledgers ≈ 17280/day).
const BUMP_AMOUNT: u32 = 518_400;
const BUMP_THRESHOLD: u32 = 60_480;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    DeadlinePassed = 4,
    GoalNotReached = 5,
    DeadlineNotReached = 6,
    GoalAlreadyReached = 7,
    NothingToRefund = 8,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Goal,
    Deadline,
    Raised,
    Donors,
    Contribution(Address),
}

/// Read-only snapshot of the campaign, returned by `get_campaign`.
#[derive(Clone)]
#[contracttype]
pub struct Campaign {
    pub admin: Address,
    pub token: Address,
    pub goal: i128,
    pub raised: i128,
    pub deadline: u64,
    pub donors: u32,
}

#[contract]
pub struct Crowdfund;

#[contractimpl]
impl Crowdfund {
    /// Configure the campaign. Callable exactly once.
    ///
    /// * `admin`    – address allowed to withdraw once the goal is met.
    /// * `token`    – the token contract to collect (the native XLM SAC on testnet).
    /// * `goal`     – target amount in stroops (1 XLM = 10_000_000 stroops).
    /// * `deadline` – unix timestamp (seconds) after which contributions stop.
    pub fn initialize(env: Env, admin: Address, token: Address, goal: i128, deadline: u64) {
        let storage = env.storage().instance();
        if storage.has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        if goal <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        storage.set(&DataKey::Admin, &admin);
        storage.set(&DataKey::Token, &token);
        storage.set(&DataKey::Goal, &goal);
        storage.set(&DataKey::Deadline, &deadline);
        storage.set(&DataKey::Raised, &0i128);
        storage.set(&DataKey::Donors, &0u32);
        storage.extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);

        env.events()
            .publish((symbol_short!("init"), admin), (goal, deadline));
    }

    /// Contribute `amount` stroops to the campaign. Transfers the tokens from
    /// `from` into this contract (requires `from`'s authorization) and records
    /// the pledge. Returns the new total raised.
    pub fn contribute(env: Env, from: Address, amount: i128) -> i128 {
        from.require_auth();
        Self::require_init(&env);

        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let deadline: u64 = Self::get(&env, &DataKey::Deadline);
        if env.ledger().timestamp() > deadline {
            panic_with_error!(&env, Error::DeadlinePassed);
        }

        // Pull the funds into escrow.
        let token_addr: Address = Self::get(&env, &DataKey::Token);
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&from, &env.current_contract_address(), &amount);

        let storage = env.storage();
        let goal: i128 = Self::get(&env, &DataKey::Goal);
        let prev_raised: i128 = Self::get(&env, &DataKey::Raised);
        let raised = prev_raised + amount;
        storage.instance().set(&DataKey::Raised, &raised);

        // Track this donor's running total (and count first-time donors).
        let key = DataKey::Contribution(from.clone());
        let prev: i128 = storage.persistent().get(&key).unwrap_or(0);
        if prev == 0 {
            let donors: u32 = Self::get(&env, &DataKey::Donors);
            storage.instance().set(&DataKey::Donors, &(donors + 1));
        }
        storage.persistent().set(&key, &(prev + amount));
        storage
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
        storage.instance().extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);

        env.events()
            .publish((symbol_short!("contrib"), from), (amount, raised));
        // Fire exactly once, on the contribution that crosses the goal.
        if raised >= goal && prev_raised < goal {
            env.events().publish((symbol_short!("reached"),), raised);
        }

        raised
    }

    /// Withdraw all escrowed funds to the admin. Only callable by the admin,
    /// and only once the goal has been reached.
    pub fn withdraw(env: Env) -> i128 {
        Self::require_init(&env);
        let admin: Address = Self::get(&env, &DataKey::Admin);
        admin.require_auth();

        let goal: i128 = Self::get(&env, &DataKey::Goal);
        let raised: i128 = Self::get(&env, &DataKey::Raised);
        if raised < goal {
            panic_with_error!(&env, Error::GoalNotReached);
        }

        let token_addr: Address = Self::get(&env, &DataKey::Token);
        let client = token::Client::new(&env, &token_addr);
        let balance = client.balance(&env.current_contract_address());
        client.transfer(&env.current_contract_address(), &admin, &balance);

        env.events().publish((symbol_short!("withdrawn"),), balance);
        balance
    }

    /// Refund the caller's contribution. Only allowed after the deadline has
    /// passed and the goal was NOT reached.
    pub fn refund(env: Env, from: Address) -> i128 {
        from.require_auth();
        Self::require_init(&env);

        let deadline: u64 = Self::get(&env, &DataKey::Deadline);
        if env.ledger().timestamp() <= deadline {
            panic_with_error!(&env, Error::DeadlineNotReached);
        }
        let goal: i128 = Self::get(&env, &DataKey::Goal);
        let raised: i128 = Self::get(&env, &DataKey::Raised);
        if raised >= goal {
            panic_with_error!(&env, Error::GoalAlreadyReached);
        }

        let key = DataKey::Contribution(from.clone());
        let amount: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if amount <= 0 {
            panic_with_error!(&env, Error::NothingToRefund);
        }

        env.storage().persistent().set(&key, &0i128);
        env.storage().instance().set(&DataKey::Raised, &(raised - amount));

        let token_addr: Address = Self::get(&env, &DataKey::Token);
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &from, &amount);

        env.events()
            .publish((symbol_short!("refund"), from), amount);
        amount
    }

    /// Full campaign snapshot for the frontend.
    pub fn get_campaign(env: Env) -> Campaign {
        Self::require_init(&env);
        Campaign {
            admin: Self::get(&env, &DataKey::Admin),
            token: Self::get(&env, &DataKey::Token),
            goal: Self::get(&env, &DataKey::Goal),
            raised: Self::get(&env, &DataKey::Raised),
            deadline: Self::get(&env, &DataKey::Deadline),
            donors: Self::get(&env, &DataKey::Donors),
        }
    }

    /// How much a single address has contributed so far.
    pub fn get_contribution(env: Env, who: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Contribution(who))
            .unwrap_or(0)
    }

    fn require_init(env: &Env) {
        if !env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(env, Error::NotInitialized);
        }
    }

    fn get<T: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(env: &Env, key: &DataKey) -> T {
        env.storage().instance().get(key).unwrap()
    }
}

mod test;
