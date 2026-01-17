import { assertEquals, assertExists } from "@std/assert";
import { armor, dearmor } from "./armor.ts";

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
