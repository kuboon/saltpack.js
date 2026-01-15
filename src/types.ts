/**
 * Type definitions for Saltpack library
 */

/**
 * A public key used for encryption (X25519) or signing (Ed25519)
 */
export type PublicKey = Uint8Array;

/**
 * A secret/private key used for encryption (X25519) or signing (Ed25519)
 */
export type SecretKey = Uint8Array;

/**
 * A key pair containing both public and secret keys
 */
export interface KeyPair {
  publicKey: PublicKey;
  secretKey: SecretKey;
}

/**
 * Saltpack format version
 */
export interface Version {
  major: number;
  minor: number;
}

/**
 * Saltpack mode types
 */
export enum Mode {
  Encryption = 0,
  AttachedSigning = 1,
  DetachedSigning = 2,
  Signcryption = 3,
}

/**
 * Result of decryption operation
 */
export interface DecryptionResult {
  plaintext: Uint8Array;
  senderPublicKey?: PublicKey;
}

/**
 * Result of verification operation
 */
export interface VerificationResult {
  message: Uint8Array;
  senderPublicKey: PublicKey;
  verified: boolean;
}
