import { assertEquals, assertExists } from "@std/assert";
import { sign, signToStr, verify } from "./signing.ts";
import { generateSigningKeyPair } from "./keys.ts";

Deno.test("sign creates a signed message", async () => {
  const keyPair = generateSigningKeyPair();
  const message = new TextEncoder().encode("Test message");

  const signed = await sign(message, keyPair);

  assertExists(signed);
  assertEquals(signed instanceof Uint8Array, true);
});

Deno.test("signToStr creates armored string", async () => {
  const keyPair = generateSigningKeyPair();
  const message = new TextEncoder().encode("Test");

  const signed = await signToStr(message, keyPair);

  assertEquals(typeof signed, "string");
  assertEquals(
    (signed as string).includes("BEGIN SALTPACK SIGNED MESSAGE"),
    true,
  );
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
