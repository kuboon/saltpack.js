import { assertEquals, assertStringIncludes } from "@std/assert";

const CLI_PATH = new URL("./cli.ts", import.meta.url).pathname;

async function runCli(
  args: string[],
  input?: string | Uint8Array,
): Promise<
  { stdout: string; stderr: string; code: number; stdoutBytes: Uint8Array }
> {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", CLI_PATH, ...args],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const process = command.spawn();
  const writer = process.stdin.getWriter();
  if (input) {
    if (typeof input === "string") {
      await writer.write(new TextEncoder().encode(input));
    } else {
      await writer.write(input);
    }
  }
  await writer.close();
  const { code, stdout, stderr } = await process.output();
  return {
    code,
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
    stdoutBytes: stdout,
  };
}

Deno.test("CLI: keygen generates keys", async () => {
  const { code, stdout } = await runCli(["keygen"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "SALTPACK_ENCRYPT_PK=");
  assertStringIncludes(stdout, "SALTPACK_DECRYPT_SK=");
  assertStringIncludes(stdout, "SALTPACK_VERIFY_PK=");
  assertStringIncludes(stdout, "SALTPACK_SIGN_SK=");
});

Deno.test("CLI: encrypt and decrypt", async () => {
  // Generate keys
  const { stdout: keyOutput } = await runCli(["keygen"]);
  const keys: Record<string, string> = {};
  for (const line of keyOutput.split("\n")) {
    const [k, v] = line.split("=");
    if (k && v) keys[k.trim()] = v.trim();
  }

  const encryptPk = keys["SALTPACK_ENCRYPT_PK"];
  const decryptSk = keys["SALTPACK_DECRYPT_SK"];
  const plaintext = "Hello, Saltpack!";

  // Encrypt
  const { code: encCode, stdout: encrypted, stderr: encStderr } = await runCli(
    ["encrypt", "-k", encryptPk],
    plaintext,
  );
  assertEquals(encCode, 0, `Encrypt failed: ${encStderr}`);
  assertStringIncludes(encrypted, "BEGIN SALTPACK ENCRYPTED MESSAGE");

  // Decrypt
  const { code: decCode, stdout: decrypted, stderr: decStderr } = await runCli(
    ["decrypt", "-k", decryptSk],
    encrypted,
  );
  assertEquals(decCode, 0, `Decrypt failed: ${decStderr}`);
  assertEquals(decrypted, plaintext);
});

Deno.test("CLI: sign and verify", async () => {
  // Generate keys
  const { stdout: keyOutput } = await runCli(["keygen"]);
  const keys: Record<string, string> = {};
  for (const line of keyOutput.split("\n")) {
    const [k, v] = line.split("=");
    if (k && v) keys[k.trim()] = v.trim();
  }

  const verifyPk = keys["SALTPACK_VERIFY_PK"];
  const signSk = keys["SALTPACK_SIGN_SK"];
  const message = "Signed Message Content";

  // Sign
  const { code: signCode, stdout: signed, stderr: signStderr } = await runCli(
    ["sign", "-k", signSk],
    message,
  );
  assertEquals(signCode, 0, `Sign failed: ${signStderr}`);
  assertStringIncludes(signed, "BEGIN SALTPACK SIGNED MESSAGE");

  // Verify
  const { code: verifyCode, stdout: verified, stderr: verifyStderr } =
    await runCli(
      ["verify", "-k", verifyPk],
      signed,
    );
  assertEquals(verifyCode, 0, `Verify failed: ${verifyStderr}`);
  assertEquals(verified, message);
});

Deno.test("CLI: help command", async () => {
  const { code, stdout } = await runCli(["--help"]);
  assertEquals(code, 0);
  assertStringIncludes(stdout, "Usage: saltpack");
});

Deno.test("CLI: encrypt missing key error", async () => {
  const { code, stderr } = await runCli(["encrypt"], "data");
  assertEquals(code, 1);
  assertStringIncludes(
    stderr,
    "Error: At least one recipient public key is required",
  );
});

Deno.test("CLI: decrypt missing key error", async () => {
  const { code, stderr } = await runCli(["decrypt"], "data");
  assertEquals(code, 1);
  assertStringIncludes(stderr, "Error: Secret key is required");
});

Deno.test("CLI: encrypt and decrypt binary", async () => {
  // Generate keys
  const { stdout: keyOutput } = await runCli(["keygen"]);
  const keys: Record<string, string> = {};
  for (const line of keyOutput.split("\n")) {
    const [k, v] = line.split("=");
    if (k && v) keys[k.trim()] = v.trim();
  }

  const encryptPk = keys["SALTPACK_ENCRYPT_PK"];
  const decryptSk = keys["SALTPACK_DECRYPT_SK"];
  const plaintext = "Hello, Binary Saltpack!";

  // Encrypt with --bin
  const {
    code: encCode,
    stdout: encryptedStr,
    stdoutBytes: encryptedBytes,
    stderr: encStderr,
  } = await runCli(
    ["encrypt", "-k", encryptPk, "--bin"],
    plaintext,
  );
  assertEquals(encCode, 0, `Encrypt failed: ${encStderr}`);

  // Verify it is NOT armored
  if (encryptedStr.includes("BEGIN SALTPACK")) {
    throw new Error("Output should not be armored in binary mode");
  }

  // Decrypt the binary bytes
  const { code: decCode, stdout: decrypted, stderr: decStderr } = await runCli(
    ["decrypt", "-k", decryptSk],
    encryptedBytes,
  );
  assertEquals(decCode, 0, `Decrypt failed: ${decStderr}`);
  assertEquals(decrypted, plaintext);
});
