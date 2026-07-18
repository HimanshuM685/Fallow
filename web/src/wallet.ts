import {
  Account,
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
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
const HORIZON_URL =
  (import.meta.env.VITE_HORIZON_URL as string | undefined) ?? "https://horizon-testnet.stellar.org";
const horizon = new Horizon.Server(HORIZON_URL);

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
 * Top up: send `amountXlm` XLM from the wallet to the platform custodial address.
 * The backend confirms it on-chain (Horizon) and credits the balance.
 */
export async function topUp(
  token: string,
  address: string,
  sign: SignXdr,
  amountXlm: number,
): Promise<{ txid: string; balanceStroops: number }> {
  const platform = (await (await fetch(`${REGISTRY_URL}/platform`)).json()) as PlatformInfo;
  if (!platform.payTo) throw new Error("platform deposit address is not configured on the server");

  // A real (broadcast) payment needs the current sequence number from Horizon.
  const source = await horizon.loadAccount(address);
  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(
      Operation.payment({
        destination: platform.payTo,
        asset: Asset.native(),
        amount: amountXlm.toFixed(7),
      }),
    )
    .setTimeout(120)
    .build();

  const signedTxXdr = await sign(tx.toXDR());

  const res = await fetch(`${REGISTRY_URL}/wallet/topup`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ payment: signedTxXdr }),
  });
  if (!res.ok) throw await apiError(res, "top-up");
  return res.json();
}
