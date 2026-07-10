import { Keypair } from "@stellar/stellar-sdk";

/**
 * Generate a fresh Stellar account and print it in the format Tendril expects.
 * Fund the address with testnet XLM before using it (payments are native XLM).
 *
 *   npm run keygen
 */
const keypair = Keypair.random();

console.log("Address:        ", keypair.publicKey());
console.log("AVM_PRIVATE_KEY=", keypair.secret());
console.log("\nNext steps:");
console.log(
  `  1. Fund the address with testnet XLM (Friendbot):  https://friendbot.stellar.org/?addr=${keypair.publicKey()}`,
);
console.log("  2. Put AVM_PRIVATE_KEY in your .env. (Payments are native XLM — no trustline needed.)");
