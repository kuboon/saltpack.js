import { assertEquals, assertExists } from "@std/assert";
import { generateKeyPair, generateSigningKeyPair } from "./keys.ts";

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
