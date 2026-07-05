#![no_std]

//! Crowdfunding factory.
//!
//! There is **no privileged admin**. Anyone can `create_campaign` — the creator
//! becomes that campaign's owner and sole beneficiary. Anyone can `contribute`
//! native XLM (via the Stellar Asset Contract) to any campaign; the funds are
//! held in escrow by this contract. A campaign's creator can `withdraw` once its
//! goal is met, and backers can `refund` themselves if a campaign's deadline
//! passes without reaching its goal. Every state change emits an event carrying
//! the campaign id so the frontend can keep live progress in sync.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env, String, Vec,
};

// Extend stored state TTL by ~30 days of ledgers on each write (5s ledgers).
const BUMP_AMOUNT: u32 = 518_400;
const BUMP_THRESHOLD: u32 = 60_480;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvalidAmount = 3,
    InvalidDeadline = 4,
    CampaignNotFound = 5,
    DeadlinePassed = 6,
    GoalNotReached = 7,
    DeadlineNotReached = 8,
    GoalAlreadyReached = 9,
    NothingToRefund = 10,
    AlreadyWithdrawn = 11,
    NotCreator = 12,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Token,
    Count,
    Campaign(u32),
    Contribution(u32, Address),
}

/// A single crowdfunding campaign.
#[derive(Clone)]
#[contracttype]
pub struct Campaign {
    pub id: u32,
    pub creator: Address,
    pub title: String,
    pub goal: i128,
    pub raised: i128,
    pub deadline: u64, // unix seconds
    pub withdrawn: bool,
}

#[contract]
pub struct Crowdfund;

#[contractimpl]
impl Crowdfund {
    /// One-time setup: record which token the factory collects (the native XLM
    /// SAC on testnet). Has no admin powers beyond this.
    pub fn initialize(env: Env, token: Address) {
        let storage = env.storage().instance();
        if storage.has(&DataKey::Token) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        storage.set(&DataKey::Token, &token);
        storage.set(&DataKey::Count, &0u32);
        storage.extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);
    }

    /// Create a campaign. The caller becomes its creator/beneficiary. Returns the
    /// new campaign id.
    pub fn create_campaign(
        env: Env,
        creator: Address,
        title: String,
        goal: i128,
        deadline: u64,
    ) -> u32 {
        creator.require_auth();
        Self::require_init(&env);
        if goal <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        if deadline <= env.ledger().timestamp() {
            panic_with_error!(&env, Error::InvalidDeadline);
        }

        let id: u32 = Self::get(&env, &DataKey::Count);
        let campaign = Campaign {
            id,
            creator: creator.clone(),
            title,
            goal,
            raised: 0,
            deadline,
            withdrawn: false,
        };
        let storage = env.storage();
        storage.persistent().set(&DataKey::Campaign(id), &campaign);
        storage
            .persistent()
            .extend_ttl(&DataKey::Campaign(id), BUMP_THRESHOLD, BUMP_AMOUNT);
        storage.instance().set(&DataKey::Count, &(id + 1));
        storage.instance().extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);

        env.events()
            .publish((symbol_short!("created"), id, creator), (goal, deadline));
        id
    }

    /// Contribute `amount` stroops to campaign `id`. Pulls the tokens into escrow
    /// (requires `from`'s authorization). Returns the campaign's new total.
    pub fn contribute(env: Env, id: u32, from: Address, amount: i128) -> i128 {
        from.require_auth();
        Self::require_init(&env);
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let mut campaign = Self::load_campaign(&env, id);
        if env.ledger().timestamp() > campaign.deadline {
            panic_with_error!(&env, Error::DeadlinePassed);
        }

        let token_addr: Address = Self::get(&env, &DataKey::Token);
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&from, &env.current_contract_address(), &amount);

        let prev_raised = campaign.raised;
        campaign.raised += amount;
        Self::save_campaign(&env, &campaign);

        let key = DataKey::Contribution(id, from.clone());
        let prev: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(prev + amount));
        env.storage()
            .persistent()
            .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);

        env.events()
            .publish((symbol_short!("contrib"), id, from), (amount, campaign.raised));
        if campaign.raised >= campaign.goal && prev_raised < campaign.goal {
            env.events().publish((symbol_short!("reached"), id), campaign.raised);
        }
        campaign.raised
    }

    /// Withdraw a campaign's escrowed funds to its creator. Only the creator, and
    /// only once the goal has been reached.
    pub fn withdraw(env: Env, id: u32) -> i128 {
        Self::require_init(&env);
        let mut campaign = Self::load_campaign(&env, id);
        campaign.creator.require_auth();

        if campaign.withdrawn {
            panic_with_error!(&env, Error::AlreadyWithdrawn);
        }
        if campaign.raised < campaign.goal {
            panic_with_error!(&env, Error::GoalNotReached);
        }

        let amount = campaign.raised;
        campaign.withdrawn = true;
        Self::save_campaign(&env, &campaign);

        let token_addr: Address = Self::get(&env, &DataKey::Token);
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &campaign.creator, &amount);

        env.events().publish((symbol_short!("withdrawn"), id), amount);
        amount
    }

    /// Refund the caller's contribution to campaign `id`. Only after the deadline
    /// has passed with the goal unmet.
    pub fn refund(env: Env, id: u32, from: Address) -> i128 {
        from.require_auth();
        Self::require_init(&env);

        let mut campaign = Self::load_campaign(&env, id);
        if env.ledger().timestamp() <= campaign.deadline {
            panic_with_error!(&env, Error::DeadlineNotReached);
        }
        if campaign.raised >= campaign.goal {
            panic_with_error!(&env, Error::GoalAlreadyReached);
        }

        let key = DataKey::Contribution(id, from.clone());
        let amount: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if amount <= 0 {
            panic_with_error!(&env, Error::NothingToRefund);
        }

        env.storage().persistent().set(&key, &0i128);
        campaign.raised -= amount;
        Self::save_campaign(&env, &campaign);

        let token_addr: Address = Self::get(&env, &DataKey::Token);
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &from, &amount);

        env.events().publish((symbol_short!("refund"), id, from), amount);
        amount
    }

    // ---- reads ----

    pub fn get_campaign_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Count).unwrap_or(0)
    }

    pub fn get_campaign(env: Env, id: u32) -> Campaign {
        Self::load_campaign(&env, id)
    }

    /// Page through campaigns, newest ids last. `limit` is capped at 50.
    pub fn get_campaigns(env: Env, start: u32, limit: u32) -> Vec<Campaign> {
        let count: u32 = env.storage().instance().get(&DataKey::Count).unwrap_or(0);
        let capped = if limit > 50 { 50 } else { limit };
        let end = core::cmp::min(start.saturating_add(capped), count);
        let mut out = Vec::new(&env);
        let mut i = start;
        while i < end {
            if let Some(c) = env.storage().persistent().get(&DataKey::Campaign(i)) {
                out.push_back(c);
            }
            i += 1;
        }
        out
    }

    pub fn get_contribution(env: Env, id: u32, who: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Contribution(id, who))
            .unwrap_or(0)
    }

    // ---- helpers ----

    fn load_campaign(env: &Env, id: u32) -> Campaign {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(id))
            .unwrap_or_else(|| panic_with_error!(env, Error::CampaignNotFound))
    }

    fn save_campaign(env: &Env, campaign: &Campaign) {
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign.id), campaign);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Campaign(campaign.id), BUMP_THRESHOLD, BUMP_AMOUNT);
    }

    fn require_init(env: &Env) {
        if !env.storage().instance().has(&DataKey::Token) {
            panic_with_error!(env, Error::NotInitialized);
        }
    }

    fn get<T: soroban_sdk::TryFromVal<Env, soroban_sdk::Val>>(env: &Env, key: &DataKey) -> T {
        env.storage().instance().get(key).unwrap()
    }
}

mod test;
