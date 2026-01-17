import { parseArgs } from "@std/cli/parse-args";
import { readAll } from "@std/io/read-all";
import {
  decrypt,
  decryptFromStr,
  encrypt,
  encryptToStr,
} from "./encryption.ts";
import {
  generateKeyPair,
  generateSigningKeyPair,
  getKeyPairFromSecret,
  getSigningKeyPairFromSecret,
} from "./keys.ts";
import { sign, signToStr, verify, verifyFromStr } from "./signing.ts";
import type { KeyPair } from "./types.ts";
import { fromHex, toHex } from "./utils.ts";

export async function cli() {
  const args = parseArgs(Deno.args, {
    boolean: ["armor", "help", "json"],
    string: ["key"],
    collect: ["key"],
    alias: { a: "armor", k: "key", h: "help" },
    default: { armor: true, json: false },
  });

  if (args.help) {
    printHelp();
    return;
  }

  const command = args._[0];

  switch (command) {
    case "encrypt":
      await handleEncrypt(args);
      break;
    case "decrypt":
      await handleDecrypt(args);
      break;
    case "sign":
      await handleSign(args);
      break;
    case "verify":
      await handleVerify(args);
      break;
    case "keygen":
      handleKeygen(args);
      break;
    default:
      if (args._.length === 0) {
        printHelp();
      } else {
        console.error(`Unknown command: ${command}`);
        printHelp();
        Deno.exit(1);
      }
  }
}

function printHelp() {
  console.log(`Usage: saltpack <command> [options]

Commands:
  encrypt    Encrypt data from stdin
  decrypt    Decrypt data from stdin
  sign       Sign data from stdin
  verify     Verify signed data from stdin
  keygen     Generate new key pairs

Options:
  -k, --key <key>         Private/Public key (hex) (for all operations)
  -a, --armor             Output as ASCII armor (default: true)
  --json                  Output keys in JSON format (for keygen)
  -h, --help              Show help
`);
}

async function handleEncrypt(args: ReturnType<typeof parseArgs>) {
  const recipientsHex = args.key as string[];

  if (!recipientsHex || recipientsHex.length === 0) {
    console.error("Error: At least one recipient public key is required (-k).");
    console.error("Example: echo 'hello' | deno run ... encrypt -k <hex-key>");
    Deno.exit(1);
  }

  let recipients: Uint8Array[];
  try {
    recipients = recipientsHex.map((hex: string) => fromHex(hex));
  } catch (_e) {
    console.error("Error parsing recipient keys: Invalid hex string.");
    Deno.exit(1);
  }

  const plaintext = await readAll(Deno.stdin);

  // Anonymous sender for now unless -k is provided?
  // For simplicity, keeping as is or using -k if we wanted authenticated encryption
  const senderKp: KeyPair | null = null;

  try {
    if (args.armor) {
      const encrypted = await encryptToStr(plaintext, senderKp, recipients);
      outputResult(encrypted);
    } else {
      const encrypted = await encrypt(plaintext, senderKp, recipients);
      outputResult(encrypted);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Encryption error:", message);
    Deno.exit(1);
  }
}

async function handleDecrypt(args: ReturnType<typeof parseArgs>) {
  const keys = args.key as string[];
  const keyHex = keys?.[0]; // Use the first key
  if (!keyHex) {
    console.error("Error: Secret key is required (-k).");
    Deno.exit(1);
  }

  const secretKey = fromHex(keyHex);
  const recipientKp = getKeyPairFromSecret(secretKey);

  const encrypted = await readAll(Deno.stdin);

  try {
    const inputStr = new TextDecoder().decode(encrypted);
    const isArmor = inputStr.trim().startsWith("BEGIN SALTPACK");

    const result = await (isArmor
      ? decryptFromStr(inputStr, recipientKp)
      : decrypt(encrypted, recipientKp));

    await Deno.stdout.write(result.plaintext);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Decryption error:", message);
    Deno.exit(1);
  }
}

async function handleSign(args: ReturnType<typeof parseArgs>) {
  const keys = args.key as string[];
  const keyHex = keys?.[0]; // Use the first key
  if (!keyHex) {
    console.error("Error: Secret key is required (-k).");
    Deno.exit(1);
  }

  const secretKey = fromHex(keyHex);
  const signingKp = getSigningKeyPairFromSecret(secretKey);

  const message = await readAll(Deno.stdin);

  try {
    if (args.armor) {
      const signed = await signToStr(message, signingKp);
      outputResult(signed);
    } else {
      const signed = await sign(message, signingKp);
      outputResult(signed);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Signing error:", message);
    Deno.exit(1);
  }
}

async function handleVerify(args: ReturnType<typeof parseArgs>) {
  const keys = args.key as string[];
  const senderHex = keys?.[0]; // Use the first key
  if (!senderHex) {
    console.error("Error: Sender public key is required (-k).");
    Deno.exit(1);
  }

  const senderKey = fromHex(senderHex);
  const signed = await readAll(Deno.stdin);

  try {
    const inputStr = new TextDecoder().decode(signed);
    const isArmor = inputStr.trim().startsWith("BEGIN SALTPACK");

    const result = await (isArmor
      ? verifyFromStr(inputStr, senderKey)
      : verify(signed, senderKey));

    if (result.verified) {
      await Deno.stdout.write(result.message);
    } else {
      console.error("Verification failed");
      Deno.exit(1);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Verification error:", message);
    Deno.exit(1);
  }
}

async function outputResult(data: Uint8Array | string) {
  if (typeof data === "string") {
    console.log(data);
  } else {
    await Deno.stdout.write(data);
  }
}

function handleKeygen(args: ReturnType<typeof parseArgs>) {
  const encKp = generateKeyPair();
  const signKp = generateSigningKeyPair();

  const encryptPk = toHex(encKp.publicKey, "pk_0x");
  const decryptSk = toHex(encKp.secretKey, "sk_0x");
  const verifyPk = toHex(signKp.publicKey, "pk_0x");
  const signSk = toHex(signKp.secretKey, "sk_0x");

  if (args.json) {
    console.log(JSON.stringify(
      {
        SALTPACK_ENCRYPT_PK: encryptPk,
        SALTPACK_DECRYPT_SK: decryptSk,
        SALTPACK_VERIFY_PK: verifyPk,
        SALTPACK_SIGN_SK: signSk,
      },
      null,
      2,
    ));
  } else {
    console.log(`SALTPACK_ENCRYPT_PK=${encryptPk}`);
    console.log(`SALTPACK_DECRYPT_SK=${decryptSk}`);
    console.log(`SALTPACK_VERIFY_PK=${verifyPk}`);
    console.log(`SALTPACK_SIGN_SK=${signSk}`);
  }
}

if (import.meta.main) {
  cli();
}
