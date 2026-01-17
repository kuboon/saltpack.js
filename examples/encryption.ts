/**
 * Basic encryption and decryption example
 *
 * Run with: deno run examples/encryption.ts
 */

import { decryptFromStr, encryptToStr, generateKeyPair } from "../mod.ts";

async function main() {
  console.log("Saltpack Encryption Example\n");

  // Generate key pairs for sender and recipient
  console.log("1. Generating key pairs...");
  const sender = generateKeyPair();
  const recipient = generateKeyPair();
  console.log("   ✓ Sender key pair generated");
  console.log("   ✓ Recipient key pair generated\n");

  // Create a message
  const message = "Hello, Saltpack! This is a secret message.";
  console.log(`2. Original message: "${message}"\n`);

  const plaintext = new TextEncoder().encode(message);

  // Encrypt the message
  console.log("3. Encrypting message...");
  const encrypted = await encryptToStr(plaintext, sender, [
    recipient.publicKey,
  ]);
  console.log("   ✓ Message encrypted\n");

  console.log("4. Encrypted message (ASCII-armored):");
  console.log(encrypted);
  console.log();

  // Decrypt the message
  console.log("5. Decrypting message...");
  const result = await decryptFromStr(encrypted, recipient);
  const decryptedText = new TextDecoder().decode(result.plaintext);
  console.log("   ✓ Message decrypted\n");

  console.log(`6. Decrypted message: "${decryptedText}"\n`);

  // Verify the decrypted message matches the original
  if (decryptedText === message) {
    console.log("✓ Success! Decrypted message matches the original.");
  } else {
    console.log("✗ Error! Decrypted message does not match.");
  }
}

// Run the example
if (import.meta.main) {
  main().catch(console.error);
}
