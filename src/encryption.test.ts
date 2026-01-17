import { assertEquals, assertExists } from "@std/assert";
import { encrypt, encryptToStr } from "./encryption.ts";
import { generateKeyPair } from "./keys.ts";

Deno.test("encrypt and decrypt basic flow", async () => {
  const sender = generateKeyPair();
  const recipient = generateKeyPair();
  const plaintext = new TextEncoder().encode("Test message");

  const encrypted = await encrypt(plaintext, sender, [recipient.publicKey]);

  assertExists(encrypted);
  assertEquals(encrypted instanceof Uint8Array, true);
});

Deno.test("encryptToStr creates armored string", async () => {
  const sender = generateKeyPair();
  const recipient = generateKeyPair();
  const plaintext = new TextEncoder().encode("Test");

  const encrypted = await encryptToStr(plaintext, sender, [
    recipient.publicKey,
  ]);

  assertEquals(typeof encrypted, "string");
  assertEquals(
    (encrypted as string).includes("BEGIN SALTPACK ENCRYPTED MESSAGE"),
    true,
  );
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
