import { Keypair } from "@stellar/stellar-sdk";

/**
 * Loads a Stellar secret seed (S…) and exposes the derived address (G…) plus a
 * nonce signer compatible with the registry's Keypair.verify check.
 */
export function loadKey(secret: string): {
  address: string;
  keypair: Keypair;
  signNonce: (nonce: string) => string;
} {
  let keypair: Keypair;
  try {
    keypair = Keypair.fromSecret(secret);
  } catch {
    throw new Error(
      "AVM_PRIVATE_KEY must be a Stellar secret seed (S…). Generate one with: npm run keygen",
    );
  }
  return {
    address: keypair.publicKey(),
    keypair,
    signNonce: (nonce: string) => keypair.sign(Buffer.from(nonce)).toString("base64"),
  };
}
