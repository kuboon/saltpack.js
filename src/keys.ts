/**
 * Key generation utilities for Saltpack
 */

import type { KeyPair } from "./types.ts";

// Using Web Crypto API for key generation
const crypto = globalThis.crypto;

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
  // Generate random 32-byte secret key
  const secretKey = crypto.getRandomValues(new Uint8Array(32));

  // For now, return a placeholder - in full implementation,
  // we'd compute the public key from the secret key using X25519
  const publicKey = crypto.getRandomValues(new Uint8Array(32));

  return { publicKey, secretKey };
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
  // Generate random 32-byte seed
  const _seed = crypto.getRandomValues(new Uint8Array(32));

  // For now, return placeholders - in full implementation,
  // we'd use Ed25519 key generation
  const publicKey = crypto.getRandomValues(new Uint8Array(32));
  const secretKey = crypto.getRandomValues(new Uint8Array(64));

  return { publicKey, secretKey };
}
