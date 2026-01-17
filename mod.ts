/**
 * @module saltpack
 *
 * A JavaScript/TypeScript implementation of the Saltpack encrypted messaging format.
 *
 * Saltpack is a modern cryptographic message format designed for encryption and signing,
 * providing better security and usability than legacy formats like PGP.
 *
 * @see https://saltpack.org/
 *
 * @example
 * ```ts
 * import { encrypt, decrypt, sign, verify } from "@kuboon/saltpack";
 *
 * // Encryption example
 * const plaintext = new TextEncoder().encode("Hello, Saltpack!");
 * const senderKeyPair = generateKeyPair();
 * const recipientKeyPair = generateKeyPair();
 *
 * const encrypted = encrypt(plaintext, senderKeyPair, [recipientKeyPair.publicKey]);
 * const decrypted = await decrypt(encrypted, recipientKeyPair);
 *
 * // Signing example
 * const message = new TextEncoder().encode("Signed message");
 * const signed = sign(message, senderKeyPair);
 * const verified = await verify(signed, senderKeyPair.publicKey);
 * ```
 */

export {
  decrypt,
  decryptFromStr,
  encrypt,
  encryptToStr,
} from "./src/encryption.ts";
export { sign, signToStr, verify, verifyFromStr } from "./src/signing.ts";
export { armor, dearmor } from "./src/armor.ts";
export { generateKeyPair, generateSigningKeyPair } from "./src/keys.ts";
export type { KeyPair, PublicKey, SecretKey } from "./src/types.ts";

if (import.meta.main) {
  const { cli } = await import("./src/cli.ts");
  await cli();
}
