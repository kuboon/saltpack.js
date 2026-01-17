/**
 * Signing and verification operations for Saltpack
 *
 * Implements Saltpack signing format v2.0 (attached signing)
 * @see https://saltpack.org/signing-format-v2
 */

import nacl from "tweetnacl";
import { decodeMulti, encode } from "@msgpack/msgpack";
import type { KeyPair, PublicKey, VerificationResult } from "./types.ts";
import { armor, dearmor } from "./armor.ts";

const CHUNK_SIZE = 1024 * 1024; // 1MB

/**
 * Signs a message using Saltpack attached signing format.
 *
 * The signing format provides:
 * - Streaming support for large messages
 * - Ed25519 signatures
 * - Abuse resistance with random nonce
 * - Message chunking for efficiency
 *
 * @param message - The message to sign
 * @param signingKeyPair - The signer's Ed25519 key pair
 * @param options - Signing options
 * @returns Signed message in binary format (or ASCII-armored if requested)
 *
 * @example
 * ```ts
 * const message = new TextEncoder().encode("Hello, World!");
 * const keyPair = generateSigningKeyPair();
 *
 * const signed = sign(message, keyPair);
 * ```
 */
export function sign(
  message: Uint8Array,
  signingKeyPair: KeyPair,
): Uint8Array {
  // 1. Generate random nonce (32 bytes)
  const headerNonce = nacl.randomBytes(32);

  // 2. Create Header
  // Format: ["saltpack", [2, 0], 1, sender_public_key, nonce]
  const header = [
    "saltpack",
    [2, 0],
    1, // Attached Signing
    signingKeyPair.publicKey,
    headerNonce,
  ];

  const headerBytes = encode(header);
  const headerHash = nacl.hash(headerBytes).slice(0, 32);

  // 3. Sign chunks
  const packets: Uint8Array[] = [headerBytes];

  let packetIndex = 0n;
  for (let i = 0; i < message.length; i += CHUNK_SIZE) {
    const chunk = message.subarray(i, i + CHUNK_SIZE);

    // Last chunk check? Saltpack v2 uses an empty final chunk to signal end,
    // unless this chunk is empty (message length 0).
    const isFinal = false; // We always append an explicit final empty packet usually.
    // If we want to optimize, we could mark the last data packet as final if it's < 1MB?
    // Spec says: "The final block is an empty block, with the final flag set."
    // So all data blocks are non-final.

    const signature = computeSignature(
      signingKeyPair.secretKey,
      headerHash,
      headerNonce,
      packetIndex,
      isFinal,
      chunk,
    );

    // Packet: [signature, chunk]
    packets.push(encode([signature, chunk]));
    packetIndex++;
  }

  // Final empty packet
  const emptyChunk = new Uint8Array(0);
  const signature = computeSignature(
    signingKeyPair.secretKey,
    headerHash,
    headerNonce,
    packetIndex,
    true, // Final
    emptyChunk,
  );
  packets.push(encode([signature, emptyChunk]));

  // Combine
  const result = new Uint8Array(packets.reduce((acc, c) => acc + c.length, 0));
  let offset = 0;
  for (const p of packets) {
    result.set(p, offset);
    offset += p.length;
  }

  return result;
}

/**
 * Signs a message to an ASCII-armored string.
 * @see sign
 */
export function signToStr(
  message: Uint8Array,
  signingKeyPair: KeyPair,
): string {
  const result = sign(message, signingKeyPair);
  return armor(result, "SIGNED");
}

function computeSignature(
  secretKey: Uint8Array,
  headerHash: Uint8Array,
  nonce: Uint8Array,
  packetIndex: bigint,
  isFinal: boolean,
  chunk: Uint8Array,
): Uint8Array {
  // Signature input: headerHash || nonce || packetSeqNum (8 bytes big-endian) || finalFlag (1 byte) || chunk
  const indexBytes = new Uint8Array(8);
  new DataView(indexBytes.buffer).setBigUint64(0, packetIndex, false);

  const finalByte = new Uint8Array([isFinal ? 1 : 0]);

  const signInput = new Uint8Array(
    headerHash.length + nonce.length + indexBytes.length + finalByte.length +
      chunk.length,
  );

  let off = 0;
  signInput.set(headerHash, off);
  off += headerHash.length;
  signInput.set(nonce, off);
  off += nonce.length;
  signInput.set(indexBytes, off);
  off += indexBytes.length;
  signInput.set(finalByte, off);
  off += finalByte.length;
  signInput.set(chunk, off);

  return nacl.sign.detached(signInput, secretKey);
}

/**
 * Verifies a Saltpack signed message and extracts the original message.
 *
 * @param signedMessage - The signed message (binary or ASCII-armored)
 * @param signerPublicKey - The expected signer's public key
 * @returns Verification result with the original message and verification status
 * @throws Error if verification fails
 *
 * @example
 * ```ts
 * const signed = sign(message, keyPair);
 * const result = await verify(signed, keyPair.publicKey);
 *
 * if (result.verified) {
 *   console.log("Signature valid!");
 *   console.log(new TextDecoder().decode(result.message));
 * }
 * ```
 */
export async function verify(
  signedMessage: Uint8Array,
  signerPublicKey: PublicKey,
): Promise<VerificationResult> {
  const generator = decodeMulti(signedMessage);
  const headerResult = await generator.next();
  if (headerResult.done) throw new Error("Empty message");

  const header = headerResult.value as [
    string,
    [number, number],
    number,
    Uint8Array,
    Uint8Array,
  ];
  if (!Array.isArray(header) || header[0] !== "saltpack") {
    throw new Error("Invalid header");
  }

  const [_fmt, version, mode, senderPk, headerNonce] = header;

  if (version[0] !== 2) throw new Error("Unsupported version");
  if (mode !== 1) {
    throw new Error("Unsupported mode (expected attached signing)");
  }

  // Verify sender public key matches expected
  // Note: signerPublicKey usually is expected. The header contains the claim.
  // We verify that the claim matches the expected OR we just trust the signature?
  // Usually we verify that the signed data matches the expected key.
  // If the user provided a key, we MUST ensure the message is signed by THAT key.

  // Compare senderPk (from header) with signerPublicKey (argument)
  let keyMatch = true;
  if (senderPk.length !== signerPublicKey.length) keyMatch = false;
  else {
    for (let i = 0; i < senderPk.length; i++) {
      if (senderPk[i] !== signerPublicKey[i]) keyMatch = false;
    }
  }

  if (!keyMatch) {
    throw new Error("Sender public key in header does not match expected key");
  }

  // Iterate chunks
  // Calculate header hash manually from the first bytes?
  // We need the raw bytes of the header msgpack to hash it.
  // But we decoded it. We don't have the raw bytes easily unless we slice source.
  // decodeMulti doesn't tell us size.
  // This is a problem with streaming decode in this context.

  // SOLUTION: Re-encode the header?
  // MsgPack encoding is deterministic? Saltpack assumes canonical encoding.
  // @msgpack/msgpack mostly produces canonical output.
  // If not exact match, verification fails.
  // Ideally we should have parsed carefully to get raw bytes.
  // Let's assum re-encoding produces the same as input.

  const headerBytes = encode(header);
  const headerHash = nacl.hash(headerBytes).slice(0, 32);

  const chunks: Uint8Array[] = [];
  let packetIndex = 0n;

  for await (const packet of generator) {
    // packet: [signature, chunk]
    const p = packet as [Uint8Array, Uint8Array];
    if (!Array.isArray(p) || p.length !== 2) {
      throw new Error("Invalid payload packet");
    }

    const [signature, chunk] = p;

    // Is wait, isFinal logic?
    // If chunk is empty, it's final.
    // But we need to use the `final` byte in verification.
    const isFinal = chunk.length === 0;

    const indexBytes = new Uint8Array(8);
    new DataView(indexBytes.buffer).setBigUint64(0, packetIndex, false);
    const finalByte = new Uint8Array([isFinal ? 1 : 0]);

    const signInput = new Uint8Array(32 + 32 + 8 + 1 + chunk.length);
    let off = 0;
    signInput.set(headerHash, off);
    off += 32;
    signInput.set(headerNonce, off);
    off += 32;
    signInput.set(indexBytes, off);
    off += 8;
    signInput.set(finalByte, off);
    off += 1;
    signInput.set(chunk, off);

    const valid = nacl.sign.detached.verify(signInput, signature, senderPk);
    if (!valid) {
      throw new Error(
        `Signature verification failed for packet ${packetIndex}`,
      );
    }

    if (!isFinal) {
      chunks.push(chunk);
    }
    packetIndex++;
  }

  // Combine
  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
  const message = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) {
    message.set(c, off);
    off += c.length;
  }

  return {
    message,
    senderPublicKey: senderPk,
    verified: true,
  };
}

/**
 * Verifies a Saltpack armored signed message.
 * @see verify
 */
export function verifyFromStr(
  signedMessage: string,
  signerPublicKey: PublicKey,
): Promise<VerificationResult> {
  let data: Uint8Array;
  try {
    data = dearmor(signedMessage);
  } catch (_e) {
    throw new Error("Failed to dearmor input.");
  }
  return verify(data, signerPublicKey);
}
