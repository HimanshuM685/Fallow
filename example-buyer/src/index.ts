/**
 * Tendril autonomous consumer agent (prepaid wallet model).
 *
 * A headless "training agent" that, with zero human clicks:
 *   1. signs in with its wallet (proves address control to the registry),
 *   2. tops up its prepaid XLM balance if it's running low,
 *   3. discovers live compute via the free GET /explorer endpoint,
 *   4. picks the cheapest node meeting its RAM requirement and rents it
 *      (no per-rent payment — the registry meters time against the balance),
 *   5. streams a training script into the sandbox via /run,
 *   6. releases the lease and reports the balance drawn down.
 */
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Account,
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
  hash,
} from "@stellar/stellar-sdk";

// Local .env first, then monorepo-root .env as fallback.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv();
loadEnv({ path: resolve(repoRoot, ".env") });
import {
  formatXlm,
  type ExplorerNode,
  type PlatformInfo,
  type RunResponse,
  type SandboxAccess,
  type WalletLoginResponse,
  type WalletNonceResponse,
  type WalletSummary,
} from "@tendril/shared";

const REGISTRY = process.env.REGISTRY_URL ?? "http://localhost:4000";
const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const NETWORK = Networks.TESTNET;
const MIN_RAM_MB = Number(process.env.AGENT_MIN_RAM_MB ?? 1024);
const LEASE_MINUTES = Number(process.env.AGENT_LEASE_MINUTES ?? 1);
const TOPUP_XLM = Number(process.env.AGENT_TOPUP_XLM ?? 2); // XLM to deposit when low
const PRIVATE_KEY = process.env.AVM_PRIVATE_KEY ?? "";

const TRAINING_SCRIPT = `
import random
random.seed(0)
# y = 3x + 2 with noise
data = [(x, 3*x + 2 + random.uniform(-0.5, 0.5)) for x in range(50)]
w, b, lr = 0.0, 0.0, 0.001
for epoch in range(2000):
    dw = db = 0.0
    for x, y in data:
        err = (w*x + b) - y
        dw += err * x
        db += err
    w -= lr * dw / len(data)
    b -= lr * db / len(data)
    if epoch % 500 == 0:
        loss = sum(((w*x+b)-y)**2 for x,y in data)/len(data)
        print(f"epoch {epoch:4d}  loss={loss:.4f}  w={w:.3f} b={b:.3f}")
print(f"DONE  learned w={w:.3f} (~3)  b={b:.3f} (~2)")
`.trim();

async function main() {
  if (!PRIVATE_KEY) {
    throw new Error(
      "AVM_PRIVATE_KEY is required (a funded testnet Stellar secret, S…). Generate one with: npm run keygen",
    );
  }

  const keypair = Keypair.fromSecret(PRIVATE_KEY);
  const address = keypair.publicKey();
  const horizon = new Horizon.Server(HORIZON_URL);
  console.log(`[agent] wallet: ${address}`);

  const platform = (await (await fetch(`${REGISTRY}/platform`)).json()) as PlatformInfo;

  // 1. Sign in: sign a 1-stroop self-payment whose memo binds the login nonce.
  const { nonce } = (await (
    await fetch(`${REGISTRY}/auth/wallet-nonce?address=${address}`)
  ).json()) as WalletNonceResponse;
  const loginTxn = new TransactionBuilder(new Account(address, "0"), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(
      Operation.payment({ destination: address, asset: Asset.native(), amount: "0.0000001" }),
    )
    .addMemo(Memo.hash(hash(Buffer.from(nonce))))
    .setTimeout(300)
    .build();
  loginTxn.sign(keypair);
  const login = (await postJson(`${REGISTRY}/auth/wallet-login`, {
    address,
    nonce,
    payment: loginTxn.toXDR(),
  })) as WalletLoginResponse;
  const auth = { authorization: `Bearer ${login.token}` };
  console.log(`[agent] signed in; balance ${formatXlm(login.balanceStroops)}`);

  // 2. Top up if the balance is low.
  if (login.balanceStroops < TOPUP_XLM * 1e7) {
    console.log(`[agent] topping up ${TOPUP_XLM} XLM → ${platform.payTo} ...`);
    const source = await horizon.loadAccount(address);
    const topTxn = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK,
    })
      .addOperation(
        Operation.payment({
          destination: platform.payTo,
          asset: Asset.native(),
          amount: TOPUP_XLM.toFixed(7),
        }),
      )
      .setTimeout(120)
      .build();
    topTxn.sign(keypair);
    const top = (await postJson(
      `${REGISTRY}/wallet/topup`,
      { payment: topTxn.toXDR() },
      auth,
    )) as { balanceStroops: number };
    console.log(`[agent] balance now ${formatXlm(top.balanceStroops)}`);
  }

  // 3. Discover.
  const { nodes } = (await (await fetch(`${REGISTRY}/explorer`)).json()) as { nodes: ExplorerNode[] };
  console.log(`[agent] ${nodes.length} live node(s) found`);

  // 4. Choose: cheapest node meeting the RAM requirement, then rent it.
  const node = nodes
    .filter((n) => n.ramMb >= MIN_RAM_MB)
    .sort((a, b) => a.pricePerHourUsd - b.pricePerHourUsd)[0];
  if (!node) throw new Error(`no online node with >= ${MIN_RAM_MB}MB RAM`);
  console.log(`[agent] picked ${node.label} (${node.id}) @ $${node.pricePerHourUsd}/hr — renting ...`);

  const lease = (await postJson(`${REGISTRY}/rent/${node.id}`, {}, auth)) as {
    leaseId: string;
    access: SandboxAccess;
    leaseToken: string;
    rateStroopsPerHour: number;
  };
  console.log(
    `[agent] lease ${lease.leaseId} active at ${formatXlm(lease.rateStroopsPerHour)}/hr; ` +
      `ssh ${lease.access.command}`,
  );

  // 5. Run the training job inside the rented sandbox.
  const before = await balanceOf(auth);
  console.log(`[agent] running training script (metering ~${LEASE_MINUTES} min) ...`);
  const run = (await postJson(
    `${REGISTRY}/lease/${lease.leaseId}/run`,
    { payload: TRAINING_SCRIPT },
    { authorization: `Bearer ${lease.leaseToken}` },
  )) as RunResponse;
  console.log("──────── remote job output ────────");
  console.log(run.result);
  console.log("───────────────────────────────────");

  // 6. Release.
  await postJson(`${REGISTRY}/lease/${lease.leaseId}/release`, {}, {
    authorization: `Bearer ${lease.leaseToken}`,
  });
  const after = await balanceOf(auth);
  console.log(`[agent] released. balance ${formatXlm(after)} (drew ~${formatXlm(Math.max(0, before - after))})`);
}

async function balanceOf(auth: Record<string, string>): Promise<number> {
  const w = (await (await fetch(`${REGISTRY}/wallet`, { headers: auth })).json()) as WalletSummary;
  return w.balanceStroops;
}

async function postJson(
  url: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status} ${await res.text()}`);
  return res.json();
}

main().catch((err) => {
  console.error("[agent] error:", err.message ?? err);
  process.exit(1);
});
