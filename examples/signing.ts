/**
 * Basic signing and verification example
 *
 * Run with: deno run examples/signing.ts
 */

import { generateSigningKeyPair, sign, verify } from "../mod.ts";

async function main() {
  console.log("Saltpack Signing Example\n");

  // Generate a signing key pair
  console.log("1. Generating signing key pair...");
  const keyPair = generateSigningKeyPair();
  console.log("   ✓ Key pair generated\n");

  // Create a message to sign
  const message = "This is an important signed message.";
  console.log(`2. Original message: "${message}"\n`);

  const messageBytes = new TextEncoder().encode(message);

  // Sign the message
  console.log("3. Signing message...");
  const signed = await sign(messageBytes, keyPair, { armor: true });
  console.log("   ✓ Message signed\n");

  if (typeof signed === "string") {
    console.log("4. Signed message (ASCII-armored):");
    console.log(signed);
    console.log();
  }

  // Verify the signature
  console.log("5. Verifying signature...");
  const result = await verify(signed, keyPair.publicKey);
  console.log("   ✓ Signature verified\n");

  if (result.verified) {
    const verifiedMessage = new TextDecoder().decode(result.message);
    console.log(`6. Verified message: "${verifiedMessage}"\n`);
    console.log("✓ Success! Signature is valid.");
  } else {
    console.log("✗ Error! Signature verification failed.");
  }
}

// Run the example
if (import.meta.main) {
  main().catch(console.error);
}
