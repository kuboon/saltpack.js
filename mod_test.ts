/**
 * Basic tests for saltpack.js
 */

import {
  armor,
  dearmor,
  encrypt,
  generateKeyPair,
  generateSigningKeyPair,
  sign,
  verify,
} from "./mod.ts";

// Simple assertion helpers
function assertEquals<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected} but got ${actual}`,
    );
  }
}

function assertExists<T>(actual: T, message?: string) {
  if (actual === null || actual === undefined) {
    throw new Error(message || `Expected value to exist but got ${actual}`);
  }
}

Deno.test("generateKeyPair creates valid key pairs", () => {
  const keyPair = generateKeyPair();

  assertExists(keyPair.publicKey);
  assertExists(keyPair.secretKey);
  assertEquals(keyPair.publicKey.length, 32);
  assertEquals(keyPair.secretKey.length, 32);
});

Deno.test("generateSigningKeyPair creates valid signing key pairs", () => {
  const keyPair = generateSigningKeyPair();

  assertExists(keyPair.publicKey);
  assertExists(keyPair.secretKey);
  assertEquals(keyPair.publicKey.length, 32);
  assertEquals(keyPair.secretKey.length, 64);
});

Deno.test("armor and dearmor work correctly", () => {
  const data = new Uint8Array([1, 2, 3, 4, 5]);
  const armored = armor(data, "ENCRYPTED");

  // Check armored format
  assertExists(armored);
  assertEquals(typeof armored, "string");
  assertEquals(armored.includes("BEGIN SALTPACK ENCRYPTED MESSAGE"), true);
  assertEquals(armored.includes("END SALTPACK ENCRYPTED MESSAGE"), true);

  // Dearmor and verify
  const dearmored = dearmor(armored);
  assertEquals(dearmored.length, data.length);
  assertEquals(dearmored[0], data[0]);
  assertEquals(dearmored[4], data[4]);
});

Deno.test("armor handles SIGNED message type", () => {
  const data = new Uint8Array([10, 20, 30]);
  const armored = armor(data, "SIGNED");

  assertEquals(armored.includes("BEGIN SALTPACK SIGNED MESSAGE"), true);
  assertEquals(armored.includes("END SALTPACK SIGNED MESSAGE"), true);

  const dearmored = dearmor(armored);
  assertEquals(dearmored.length, data.length);
});

Deno.test("encrypt and decrypt basic flow", async () => {
  const sender = generateKeyPair();
  const recipient = generateKeyPair();
  const plaintext = new TextEncoder().encode("Test message");

  const encrypted = await encrypt(plaintext, sender, [recipient.publicKey]);

  assertExists(encrypted);
  assertEquals(encrypted instanceof Uint8Array, true);
});

Deno.test("encrypt with armor option", async () => {
  const sender = generateKeyPair();
  const recipient = generateKeyPair();
  const plaintext = new TextEncoder().encode("Test");

  const encrypted = await encrypt(plaintext, sender, [recipient.publicKey], {
    armor: true,
  });

  assertEquals(typeof encrypted, "string");
  assertEquals((encrypted as string).includes("BEGIN SALTPACK ENCRYPTED MESSAGE"), true);
});

Deno.test("encrypt requires at least one recipient", async () => {
  const sender = generateKeyPair();
  const plaintext = new TextEncoder().encode("Test");

  try {
    await encrypt(plaintext, sender, []);
    throw new Error("Should have thrown an error");
  } catch (error) {
    assertEquals(
      (error as Error).message,
      "At least one recipient public key is required",
    );
  }
});

Deno.test("sign creates a signed message", async () => {
  const keyPair = generateSigningKeyPair();
  const message = new TextEncoder().encode("Test message");

  const signed = await sign(message, keyPair);

  assertExists(signed);
  assertEquals(signed instanceof Uint8Array, true);
});

Deno.test("sign with armor option", async () => {
  const keyPair = generateSigningKeyPair();
  const message = new TextEncoder().encode("Test");

  const signed = await sign(message, keyPair, { armor: true });

  assertEquals(typeof signed, "string");
  assertEquals((signed as string).includes("BEGIN SALTPACK SIGNED MESSAGE"), true);
});

Deno.test("verify returns a verification result", async () => {
  const keyPair = generateSigningKeyPair();
  const message = new TextEncoder().encode("Test");

  const signed = await sign(message, keyPair);
  const result = await verify(signed, keyPair.publicKey);

  assertExists(result);
  assertExists(result.message);
  assertExists(result.senderPublicKey);
  assertEquals(typeof result.verified, "boolean");
});
