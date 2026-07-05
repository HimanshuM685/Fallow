// Deployed Soroban crowdfunding *factory* (Stellar testnet).
// Anyone can create a campaign or contribute — there is no privileged admin.
// Redeploy from `contract/` and drop the new id here (or set NEXT_PUBLIC_*).

export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ??
  "CDAVG46KQE4IGGSP4Q2CJ4WSL3CAAFUF73CH4MYR3N4G75JYNH2NR46B";

// Native XLM Stellar Asset Contract on testnet (the token campaigns collect).
export const NATIVE_SAC_ID =
  process.env.NEXT_PUBLIC_NATIVE_SAC_ID ??
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// A funded account used only as the *source* for read-only simulations
// (no signature, no privileges). Any existing testnet account works.
export const READ_SOURCE_ADDRESS =
  process.env.NEXT_PUBLIC_READ_SOURCE ??
  "GDMFYJCUB23Q7ID26S3KGTRAR2LAQUNDKOQ2IZOAKVRWJ3THTNSHECSQ";

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  "https://soroban-testnet.stellar.org";

// 1 XLM = 10,000,000 stroops (7 decimals).
export const STROOPS_PER_XLM = 10_000_000;

export const EXPLORER_TX = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;
export const EXPLORER_CONTRACT = (id: string) =>
  `https://stellar.expert/explorer/testnet/contract/${id}`;
export const EXPLORER_ACCOUNT = (addr: string) =>
  `https://stellar.expert/explorer/testnet/account/${addr}`;

export const APP = {
  name: "Fallow",
  tagline: "Community crowdfunding on Stellar. Start a campaign or back one — funds are escrowed on-chain.",
  // quick-pick contribution amounts (XLM)
  contributePresets: [10, 50, 100],
  // create-form defaults
  defaultDurationDays: 30,
  titleMaxLength: 40,
};
