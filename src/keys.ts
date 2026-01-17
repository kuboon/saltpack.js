/**
 * Key generation utilities for Saltpack
 */

import type { KeyPair } from "./types.ts";
import nacl from "tweetnacl";

/**
 * Generates a new key pair for encryption/decryption operations.
 * Uses X25519 (Curve25519) for Diffie-Hellman key exchange.
 *
 * @returns A new key pair with publicKey and secretKey
 *
 * @example
 * ```ts
 * const keyPair = generateKeyPair();
 * console.log(keyPair.publicKey.length); // 32 bytes
 * console.log(keyPair.secretKey.length); // 32 bytes
 * ```
 */
export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair();
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

/**
 * Generates a new key pair for signing/verification operations.
 * Uses Ed25519 for digital signatures.
 *
 * @returns A new key pair with publicKey and secretKey
 *
 * @example
 * ```ts
 * const signingKeyPair = generateSigningKeyPair();
 * console.log(signingKeyPair.publicKey.length); // 32 bytes
 * console.log(signingKeyPair.secretKey.length); // 64 bytes
 * ```
 */
export function generateSigningKeyPair(): KeyPair {
  const kp = nacl.sign.keyPair();
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

export function getKeyPairFromSecret(secretKey: Uint8Array): KeyPair {
  const kp = nacl.box.keyPair.fromSecretKey(secretKey);
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

export function getSigningKeyPairFromSecret(secretKey: Uint8Array): KeyPair {
  const kp = nacl.sign.keyPair.fromSecretKey(secretKey);
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}
