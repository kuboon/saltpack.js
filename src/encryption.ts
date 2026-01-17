/**
 * Encryption and decryption operations for Saltpack
 *
 * Implements Saltpack encryption format v2.0
 * @see https://saltpack.org/encryption-format-v2
 */

import nacl from "tweetnacl";
import { decodeMulti, encode } from "@msgpack/msgpack";
import type { DecryptionResult, KeyPair, PublicKey } from "./types.ts";
import { armor, dearmor } from "./armor.ts";

const CHUNK_SIZE = 1024 * 1024; // 1MB

// Nonce prefixes
const NONCE_PREFIX_RECIPS = new TextEncoder().encode("saltpack_recipsb");
const NONCE_PREFIX_SENDER = new TextEncoder().encode("saltpack_sender_");
const NONCE_PREFIX_PAYLOAD = new TextEncoder().encode("saltpack_ploadsb");

function makeNonce(prefix: Uint8Array, index: bigint): Uint8Array {
  const nonce = new Uint8Array(24);
  nonce.set(prefix);
  const dv = new DataView(nonce.buffer);
  dv.setBigUint64(16, index, false); // Big Endian
  return nonce;
}

export async function encrypt(
  plaintext: Uint8Array,
  senderKeyPair: KeyPair | null,
  recipientPublicKeys: PublicKey[],
  options?: { armor?: boolean },
): Promise<Uint8Array | string> {
  if (recipientPublicKeys.length === 0) {
    throw new Error("At least one recipient public key is required");
  }

  // 1. Generate payload key (32 bytes)
  const payloadKey = nacl.randomBytes(32);

  // 2. Generate ephemeral key pair
  const ephemeralKeyPair = nacl.box.keyPair();

  // 3. Prepare recipients list
  const recipientPairs: [Uint8Array, Uint8Array][] = [];

  recipientPublicKeys.forEach((recipientPk, i) => {
    const nonce = makeNonce(NONCE_PREFIX_RECIPS, BigInt(i));
    const payloadKeyBox = nacl.box(
      payloadKey,
      nonce,
      recipientPk,
      ephemeralKeyPair.secretKey,
    );
    recipientPairs.push([recipientPk, payloadKeyBox]);
  });

  // 4. Encrypt sender public key (or zeros if anonymous)
  const senderSecretboxNonce = makeNonce(NONCE_PREFIX_SENDER, 0n);
  const senderPkToEncrypt = senderKeyPair
    ? senderKeyPair.publicKey
    : new Uint8Array(32);
  const senderSecretbox = nacl.secretbox(
    senderPkToEncrypt,
    senderSecretboxNonce,
    payloadKey,
  );

  // 5. Construct Header
  const header = [
    "saltpack",
    [2, 0],
    0, // Mode: Encryption
    ephemeralKeyPair.publicKey,
    senderSecretbox,
    recipientPairs,
  ];

  const headerBytes = encode(header);

  // 6. Encrypt Payload Chunks
  const chunks: Uint8Array[] = [headerBytes];

  let packetIndex = 0n;
  for (let i = 0; i < plaintext.length; i += CHUNK_SIZE) {
    const chunkPlaintext = plaintext.subarray(i, i + CHUNK_SIZE);

    const nonce = makeNonce(NONCE_PREFIX_PAYLOAD, packetIndex);
    const chunkCiphertext = nacl.secretbox(
      chunkPlaintext,
      nonce,
      payloadKey,
    );

    // Payload packet: [ciphertext]
    const packet = encode([chunkCiphertext]);
    chunks.push(packet);
    packetIndex++;
  }

  // EOF chunk (strictly needed for Saltpack v2)
  // If the last chunk was less than 1MB, it's the final chunk.
  // BUT the spec says: "The stream is terminated by a payload packet containing an empty chunk."
  // Wait, "Note that if the message length is a multiple of the chunk size (1 MB), an empty packet will be appended to the end."
  // This implies if it's NOT a multiple (and thus handled by the loop as a partial block), we don't need an extra empty block?
  // Let's re-read typical behavior.
  // Actually, standard behavior in many chunked formats is explicit EOF chunk unless the last chunk has a flag.
  // Saltpack v2 payload packet structure is just `[ciphertext]`.
  // It does not have a "final" flag bit.
  // So the detector of EOF is decrypting an empty chunk.
  // Yes, "The end of the message is indicated by a payload packet containing an empty chunk."
  // Wait, if the payload is `[ciphertext]`, the plaintext inside is empty.
  // `nacl.secretbox([], ...)` -> 16 bytes auth tag.
  // So `[auth_tag]` is the packet.
  // So we ALWAYS append an empty chunk? Or only if we haven't signalled EOF otherwise?
  // If the last processed chunk is empty (i.e. bytes=0), that is the empty chunk.
  // My loop processes:
  // if len=500: loop i=0..500. chunkPlaintext len=500. Encrypts. packetIndex=1.
  // Loop ends.
  // Do I push an empty chunk?
  // If I don't, the decoder reads 500 bytes and then stream ends.
  // Does decoder throw "unexpected EOF" or accept it?
  // If the protocol requires an empty chunk to explicitly terminate, I should add it if the last one wasn't empty.
  // My logic `if (plaintext.length % CHUNK_SIZE === 0)` adds it for 0 and multiples of 1MB.
  // What about 500 bytes?
  // If I don't add it, is it valid?
  // Most streaming protocols require explicit termination.
  // I will add the empty chunk logic:
  // If the last chunk generated was NOT empty, add an empty one.
  // `plaintext.length % CHUNK_SIZE === 0` handles the case where the loop didn't produce a partial chunk (or produced nothing).
  // If `plaintext.length % CHUNK_SIZE !== 0`, the loop produced a partial chunk.
  // We STILL need an empty chunk to say "that was the last one".
  // So, actually we ALWAYS need an empty chunk at the end?
  // Specification: "The final chunk can be any size from 0 to 1MB (inclusive). ... The end of the message is indicated by a payload packet containing an empty chunk."
  // This phrasing is slightly ambiguous.
  // "The end is indicated by... an empty chunk." implies we MUST have one.
  // Keybase implementation seems to always append empty chunk?
  // Let's assume Yes.
  // But strictly, if I send 500 bytes, and then an empty chunk, that's 2 packets.
  // If I send 0 bytes, just empty chunk? Yes.

  // So I should always append empty chunk?
  // Except if I just appended one?
  // The loop processes data.
  // If I append a partial chunk (500 bytes), that's not "empty".
  // So I need to append an extra empty one.
  // If I append a full chunk (1MB), that's not "empty".
  // So I need to append an extra empty one.
  // So I ALWAYS append an extra empty chunk?
  // YES.

  const nonce = makeNonce(NONCE_PREFIX_PAYLOAD, packetIndex);
  const emptyCiphertext = nacl.secretbox(
    new Uint8Array(0),
    nonce,
    payloadKey,
  );
  chunks.push(encode([emptyCiphertext]));

  const result = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }

  if (options?.armor) {
    return armor(result, "ENCRYPTED");
  }

  return result;
}

export async function decrypt(
  encrypted: Uint8Array | string,
  recipientKeyPair: KeyPair,
): Promise<DecryptionResult> {
  let data: Uint8Array;
  if (typeof encrypted === "string") {
    try {
      data = dearmor(encrypted);
    } catch (_e) {
      throw new Error("Failed to dearmor input.");
    }
  } else {
    data = encrypted;
  }

  const generator = decodeMulti(data);
  const headerResult = await generator.next();
  if (headerResult.done) throw new Error("Empty message");

  // Header is [ format, [major, minor], mode, ephemeralPk, senderSecretbox, recipientsList ]
  const header = headerResult.value as [
    string,
    [number, number],
    number,
    Uint8Array,
    Uint8Array,
    [Uint8Array, Uint8Array][],
  ];

  if (!Array.isArray(header) || header[0] !== "saltpack") {
    throw new Error("Invalid saltpack header");
  }

  const [
    _format,
    version,
    mode,
    ephemeralPk,
    senderSecretbox,
    recipientPairs,
  ] = header;

  if (version[0] !== 2) throw new Error("Unsupported version");
  if (mode !== 0) throw new Error("Unsupported mode");

  // Find Recipient and Decrypt Payload Key
  let payloadKey: Uint8Array | null = null;
  let index = 0n;

  for (const pair of recipientPairs) {
    const [recipientPk, payloadKeyBox] = pair;

    // Check if recipientPk matches our key pair
    let match = true;
    if (recipientPk.length !== recipientKeyPair.publicKey.length) match = false;
    else {
      for (let k = 0; k < recipientPk.length; k++) {
        if (recipientPk[k] !== recipientKeyPair.publicKey[k]) {
          match = false;
          break;
        }
      }
    }

    if (match) {
      const nonce = makeNonce(NONCE_PREFIX_RECIPS, index);
      const decrypted = nacl.box.open(
        payloadKeyBox,
        nonce,
        ephemeralPk,
        recipientKeyPair.secretKey,
      );

      if (decrypted) {
        payloadKey = decrypted;
        break;
      }
    }
    index++;
  }

  if (!payloadKey) {
    throw new Error("Could not decrypt payload key");
  }

  // Decrypt Sender Public Key
  const senderNonce = makeNonce(NONCE_PREFIX_SENDER, 0n);
  const senderPkDecrypted = nacl.secretbox.open(
    senderSecretbox,
    senderNonce,
    payloadKey,
  );

  if (!senderPkDecrypted) {
    throw new Error("Failed to decrypt sender public key");
  }

  let isAnon = true;
  for (let b of senderPkDecrypted) if (b !== 0) isAnon = false;
  const senderPublicKey = isAnon ? undefined : senderPkDecrypted;

  // Decrypt Payload Chunks
  const decryptedChunks: Uint8Array[] = [];
  let packetIndex = 0n;

  for await (const packet of generator) {
    const p = packet as [Uint8Array];
    if (!Array.isArray(p) || p.length !== 1) {
      continue;
    }
    const ciphertext = p[0];
    const nonce = makeNonce(NONCE_PREFIX_PAYLOAD, packetIndex);

    const chunk = nacl.secretbox.open(
      ciphertext,
      nonce,
      payloadKey,
    );

    if (!chunk) {
      throw new Error("Failed to decrypt payload chunk " + packetIndex);
    }

    // Empty chunk marks end of message
    if (chunk.length === 0) {
      break;
    }

    decryptedChunks.push(chunk);
    packetIndex++;
  }

  const totalLen = decryptedChunks.reduce((s, c) => s + c.length, 0);
  const plaintext = new Uint8Array(totalLen);
  let off = 0;
  for (const c of decryptedChunks) {
    plaintext.set(c, off);
    off += c.length;
  }

  return { plaintext, senderPublicKey };
}
