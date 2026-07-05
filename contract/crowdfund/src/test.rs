#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, String,
};

struct Setup<'a> {
    env: Env,
    token_admin: token::StellarAssetClient<'a>,
    token_client: token::Client<'a>,
    contract: CrowdfundClient<'a>,
    contract_id: Address,
}

fn setup() -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let token = sac.address();

    let contract_id = env.register(Crowdfund, ());
    let contract = CrowdfundClient::new(&env, &contract_id);
    contract.initialize(&token);

    Setup {
        token_admin: token::StellarAssetClient::new(&env, &token),
        token_client: token::Client::new(&env, &token),
        env,
        contract,
        contract_id,
    }
}

fn make_campaign(s: &Setup, goal: i128, deadline: u64) -> (u32, Address) {
    let creator = Address::generate(&s.env);
    let title = String::from_str(&s.env, "Open-source toolkit");
    let id = s.contract.create_campaign(&creator, &title, &goal, &deadline);
    (id, creator)
}

#[test]
fn create_and_read_campaigns() {
    let s = setup();
    let (id0, c0) = make_campaign(&s, 1_000, 10_000);
    let (id1, _c1) = make_campaign(&s, 2_000, 10_000);
    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
    assert_eq!(s.contract.get_campaign_count(), 2);

    let c = s.contract.get_campaign(&id0);
    assert_eq!(c.creator, c0);
    assert_eq!(c.goal, 1_000);
    assert_eq!(c.raised, 0);

    let all = s.contract.get_campaigns(&0, &10);
    assert_eq!(all.len(), 2);
}

#[test]
fn contribute_escrows_and_tracks() {
    let s = setup();
    let (id, _) = make_campaign(&s, 1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &500);

    let raised = s.contract.contribute(&id, &donor, &300);
    assert_eq!(raised, 300);
    assert_eq!(s.contract.get_campaign(&id).raised, 300);
    assert_eq!(s.contract.get_contribution(&id, &donor), 300);
    assert_eq!(s.token_client.balance(&s.contract_id), 300);
    assert_eq!(s.token_client.balance(&donor), 200);
}

#[test]
fn creator_withdraws_after_goal() {
    let s = setup();
    let (id, creator) = make_campaign(&s, 1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &2_000);
    s.contract.contribute(&id, &donor, &1_000);

    let paid = s.contract.withdraw(&id);
    assert_eq!(paid, 1_000);
    assert_eq!(s.token_client.balance(&creator), 1_000);
    assert_eq!(s.token_client.balance(&s.contract_id), 0);
    assert!(s.contract.get_campaign(&id).withdrawn);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")] // GoalNotReached
fn withdraw_blocked_before_goal() {
    let s = setup();
    let (id, _) = make_campaign(&s, 1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &2_000);
    s.contract.contribute(&id, &donor, &100);
    s.contract.withdraw(&id);
}

#[test]
fn backer_refunds_after_failed_deadline() {
    let s = setup();
    let (id, _) = make_campaign(&s, 1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &500);
    s.contract.contribute(&id, &donor, &400);

    s.env.ledger().set_timestamp(10_001);
    let refunded = s.contract.refund(&id, &donor);
    assert_eq!(refunded, 400);
    assert_eq!(s.token_client.balance(&donor), 500);
    assert_eq!(s.contract.get_campaign(&id).raised, 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")] // DeadlinePassed
fn contribute_blocked_after_deadline() {
    let s = setup();
    let (id, _) = make_campaign(&s, 1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &500);
    s.env.ledger().set_timestamp(10_001);
    s.contract.contribute(&id, &donor, &100);
}

#[test]
fn campaigns_are_independent() {
    let s = setup();
    let (a, _) = make_campaign(&s, 1_000, 10_000);
    let (b, _) = make_campaign(&s, 1_000, 10_000);
    let donor = Address::generate(&s.env);
    s.token_admin.mint(&donor, &1_000);

    s.contract.contribute(&a, &donor, &200);
    s.contract.contribute(&b, &donor, &500);
    assert_eq!(s.contract.get_campaign(&a).raised, 200);
    assert_eq!(s.contract.get_campaign(&b).raised, 500);
    assert_eq!(s.token_client.balance(&s.contract_id), 700);
}
