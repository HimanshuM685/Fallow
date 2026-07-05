// Deployed Soroban crowdfunding contract (Stellar testnet).
// Redeploy with `contract/` + `stellar contract deploy` and drop the new id here
// (or set the matching NEXT_PUBLIC_* env var) to point the frontend elsewhere.

export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ??
  "CAPBMALOG2MXQZLPWQIVCI65DG74ELN6OG4D7RR7HTYFTZWFA3YBHBDH";

// Native XLM Stellar Asset Contract on testnet (the token the campaign collects).
export const NATIVE_SAC_ID =
  process.env.NEXT_PUBLIC_NATIVE_SAC_ID ??
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// Contract admin — the only address allowed to withdraw once the goal is met.
export const ADMIN_ADDRESS =
  process.env.NEXT_PUBLIC_ADMIN_ADDRESS ??
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

// On-page campaign copy (generic open-source fund — edit freely).
export const CAMPAIGN = {
  title: "Fund an open-source Stellar toolkit",
  tagline: "Help ship a free, MIT-licensed developer kit for building on Stellar.",
  blurb:
    "Every contribution is real testnet XLM held in escrow by the smart contract. " +
    "If we hit the goal, the maintainer can withdraw to keep building. If we fall " +
    "short by the deadline, you can refund yourself — trustlessly, on-chain.",
  presets: [25, 100, 250], // XLM quick-pick buttons
};
