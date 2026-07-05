#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env,
};

struct Setup<'a> {
    env: Env,
    admin: Address,
    token: Address,
    token_admin: token::StellarAssetClient<'a>,
    token_client: token::Client<'a>,
    contract: CrowdfundClient<'a>,
    contract_id: Address,
}

fn setup(goal: i128, deadline: u64) -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let token = sac.address();

    let contract_id = env.register(Crowdfund, ());
    let contract = CrowdfundClient::new(&env, &contract_id);
    contract.initialize(&admin, &token, &goal, &deadline);

    Setup {
        token_admin: token::StellarAssetClient::new(&env, &token),
        token_client: token::Client::new(&env, &token),
        env,
        admin,
        token,
        contract,
        contract_id,
    }
}

#[test]
fn contribute_updates_progress() {
    let s = setup(1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &500);

    let raised = s.contract.contribute(&donor, &300);
    assert_eq!(raised, 300);

    let c = s.contract.get_campaign();
    assert_eq!(c.raised, 300);
    assert_eq!(c.donors, 1);
    assert_eq!(c.goal, 1_000);
    assert_eq!(s.contract.get_contribution(&donor), 300);
    // Funds actually moved into escrow.
    assert_eq!(s.token_client.balance(&s.contract_id), 300);
    assert_eq!(s.token_client.balance(&donor), 200);
}

#[test]
fn admin_withdraws_after_goal_met() {
    let s = setup(1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &2_000);

    s.contract.contribute(&donor, &1_000);
    let paid = s.contract.withdraw();
    assert_eq!(paid, 1_000);
    assert_eq!(s.token_client.balance(&s.admin), 1_000);
    assert_eq!(s.token_client.balance(&s.contract_id), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")] // GoalNotReached
fn withdraw_blocked_before_goal() {
    let s = setup(1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &2_000);
    s.contract.contribute(&donor, &100);
    s.contract.withdraw();
}

#[test]
fn donor_refunds_after_failed_deadline() {
    let s = setup(1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &500);
    s.contract.contribute(&donor, &400);

    // Move past the deadline with the goal unmet.
    s.env.ledger().set_timestamp(10_001);
    let refunded = s.contract.refund(&donor);

    assert_eq!(refunded, 400);
    assert_eq!(s.token_client.balance(&donor), 500);
    assert_eq!(s.contract.get_campaign().raised, 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")] // DeadlinePassed
fn contribute_blocked_after_deadline() {
    let s = setup(1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &500);
    s.env.ledger().set_timestamp(10_001);
    s.contract.contribute(&donor, &100);
}
