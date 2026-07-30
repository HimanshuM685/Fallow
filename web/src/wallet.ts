import {
  Account,
  Asset,
  BASE_FEE,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
  contract,
  hash,
} from "@stellar/stellar-sdk";
import type {
  PlatformInfo,
  WalletLoginResponse,
  WalletNonceResponse,
} from "@fallow/shared";
import { REGISTRY_URL, apiError } from "./api";

/** Signs an XDR string with the connected wallet, returning the signed XDR. */
type SignXdr = (xdr: string) => Promise<string>;

const NETWORK = Networks.TESTNET;
const SOROBAN_RPC_URL =
  (import.meta.env.VITE_SOROBAN_RPC_URL as string | undefined) ?? "https://soroban-testnet.stellar.org";

// `contract.Client`'s per-contract methods are attached dynamically at runtime
// (from the deployed contract's on-chain spec), so plain structural typing
// can't see them without codegen — this local cast just names the one method
// this file calls.
type LedgerClient = contract.Client & {
  topup(args: { from: string; amount: bigint }): Promise<contract.AssembledTransaction<null>>;
};

/**
 * Sign in: prove control of `address` by signing a 1-stroop self-payment whose
 * memo is the hash of the login nonce. The txn is never broadcast — the backend
 * just verifies the signature. A dummy sequence is fine (no Horizon call needed).
 */
export async function loginWithWallet(
  address: string,
  sign: SignXdr,
): Promise<WalletLoginResponse> {
  const { nonce } = (await (
    await fetch(`${REGISTRY_URL}/auth/wallet-nonce?address=${address}`)
  ).json()) as WalletNonceResponse;

  const source = new Account(address, "0");
  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(
      Operation.payment({ destination: address, asset: Asset.native(), amount: "0.0000001" }),
    )
    .addMemo(Memo.hash(hash(Buffer.from(nonce))))
    .setTimeout(300)
    .build();

  const signedTxXdr = await sign(tx.toXDR());

  const res = await fetch(`${REGISTRY_URL}/auth/wallet-login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, nonce, payment: signedTxXdr }),
  });
  if (!res.ok) throw await apiError(res, "sign-in");
  return res.json();
}

/**
 * Top up: call `topup(from, amount)` on the Fallow ledger contract, which
 * relays `amountXlm` XLM from the wallet to the platform's custodial address
 * and emits a public event. The backend confirms it on-chain and credits the
 * balance.
 */
export async function topUp(
  token: string,
  address: string,
  sign: SignXdr,
  amountXlm: number,
): Promise<{ txid: string; balanceStroops: number }> {
  const platform = (await (await fetch(`${REGISTRY_URL}/platform`)).json()) as PlatformInfo;
  if (!platform.contractId) throw new Error("ledger contract is not configured on the server");

  const client = (await contract.Client.from({
    contractId: platform.contractId,
    networkPassphrase: NETWORK,
    rpcUrl: SOROBAN_RPC_URL,
    publicKey: address,
  })) as LedgerClient;
  const assembledTx = await client.topup({
    from: address,
    amount: BigInt(Math.round(amountXlm * 1e7)),
  });
  await assembledTx.sign({ signTransaction: async (xdr) => ({ signedTxXdr: await sign(xdr) }) });
  // `.sign()` stores the signed transaction on `.signed` — `.toXDR()` always
  // serializes the *unsigned* `.built` transaction, so it must not be used here.
  if (!assembledTx.signed) throw new Error("top-up transaction was not signed");

  const res = await fetch(`${REGISTRY_URL}/wallet/topup`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ payment: assembledTx.signed.toXDR() }),
  });
  if (!res.ok) throw await apiError(res, "top-up");
  return res.json();
}
