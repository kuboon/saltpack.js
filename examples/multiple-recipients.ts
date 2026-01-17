/**
 * Example of encrypting to multiple recipients
 *
 * Run with: deno run examples/multiple-recipients.ts
 */

import { decryptFromStr, encryptToStr, generateKeyPair } from "../mod.ts";

async function main() {
  console.log("Saltpack Multiple Recipients Example\n");

  // Generate key pairs
  console.log("1. Generating key pairs...");
  const sender = generateKeyPair();
  const alice = generateKeyPair();
  const bob = generateKeyPair();
  const charlie = generateKeyPair();
  console.log("   ✓ Sender key pair generated");
  console.log("   ✓ Alice's key pair generated");
  console.log("   ✓ Bob's key pair generated");
  console.log("   ✓ Charlie's key pair generated\n");

  // Create a message
  const message = "This message is for Alice, Bob, and Charlie.";
  console.log(`2. Original message: "${message}"\n`);

  const plaintext = new TextEncoder().encode(message);

  // Encrypt for multiple recipients
  console.log("3. Encrypting message for 3 recipients...");
  const encrypted = await encryptToStr(
    plaintext,
    sender,
    [alice.publicKey, bob.publicKey, charlie.publicKey],
  );
  console.log("   ✓ Message encrypted for Alice, Bob, and Charlie\n");

  // Each recipient can decrypt the message
  console.log("4. Each recipient decrypting the message:\n");

  // Alice decrypts
  console.log("   Alice decrypting...");
  const aliceResult = await decryptFromStr(encrypted, alice);
  const aliceText = new TextDecoder().decode(aliceResult.plaintext);
  console.log(`   ✓ Alice received: "${aliceText}"\n`);

  // Bob decrypts
  console.log("   Bob decrypting...");
  const bobResult = await decryptFromStr(encrypted, bob);
  const bobText = new TextDecoder().decode(bobResult.plaintext);
  console.log(`   ✓ Bob received: "${bobText}"\n`);

  // Charlie decrypts
  console.log("   Charlie decrypting...");
  const charlieResult = await decryptFromStr(encrypted, charlie);
  const charlieText = new TextDecoder().decode(charlieResult.plaintext);
  console.log(`   ✓ Charlie received: "${charlieText}"\n`);

  // Verify all recipients got the same message
  if (
    aliceText === message && bobText === message && charlieText === message
  ) {
    console.log("✓ Success! All recipients received the same message.");
  } else {
    console.log("✗ Error! Recipients received different messages.");
  }
}

// Run the example
if (import.meta.main) {
  main().catch(console.error);
}
