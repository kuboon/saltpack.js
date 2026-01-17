import { parseArgs } from "@std/cli/parse-args";
import { readAll } from "@std/io/read-all";
import { decrypt, encrypt } from "./encryption.ts";
import { sign, verify } from "./signing.ts";
import type { KeyPair } from "./types.ts";

export async function cli() {
  const args = parseArgs(Deno.args, {
    boolean: ["armor", "help"],
    string: ["recipient", "sender", "key"],
    collect: ["recipient"],
    alias: { a: "armor", r: "recipient", s: "sender", k: "key", h: "help" },
    default: { armor: true },
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

Options:
  -r, --recipient <key>   Recipient public key (hex) (for encrypt)
  -s, --sender <key>      Sender public key (hex) (for verify)
  -k, --key <key>         Secret key (hex) (for decrypt, sign)
  -a, --armor             Output as ASCII armor (default: true)
  -h, --help              Show help
`);
}

async function handleEncrypt(args: ReturnType<typeof parseArgs>) {
  const recipientsHex = args.recipient as string[];

  if (!recipientsHex || recipientsHex.length === 0) {
    console.error("Error: At least one recipient public key is required (-r).");
    console.error("Example: echo 'hello' | deno run ... encrypt -r <hex-key>");
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
    const encrypted = await encrypt(plaintext, senderKp, recipients, {
      armor: args.armor,
    });
    await outputResult(encrypted);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Encryption error:", message);
    Deno.exit(1);
  }
}

async function handleDecrypt(args: ReturnType<typeof parseArgs>) {
  const keyHex = args.key as string;
  if (!keyHex) {
    console.error("Error: Secret key is required (-k).");
    Deno.exit(1);
  }

  const secretKey = fromHex(keyHex);
  // In a real impl, we'd derive public key. Here we use a placeholder.
  const recipientKp: KeyPair = {
    secretKey,
    publicKey: new Uint8Array(32),
  };

  const encrypted = await readAll(Deno.stdin);

  try {
    // Decrypt can handle binary or string (armored)
    // readAll returns Uint8Array. If input is armored string, we need to convert it?
    // The decrypt function signature takes Uint8Array | string.
    // If we read stdin, we get bytes. If those bytes are ASCII armor, we can pass them as string or bytes.
    // The current decrypt implementation (placeholder) might not care, but `dearmor` expects string.
    // Let's decode to string if it looks like armor?
    // Actually, let's just pass the Uint8Array. If `decrypt` expects string for armor, we might need to TextDecoder it.
    // Let's assume input might be armor.
    const inputStr = new TextDecoder().decode(encrypted);
    const input = inputStr.trim().startsWith("BEGIN SALTPACK")
      ? inputStr
      : encrypted;

    const result = await decrypt(input, recipientKp);
    await Deno.stdout.write(result.plaintext);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Decryption error:", message);
    Deno.exit(1);
  }
}

async function handleSign(args: ReturnType<typeof parseArgs>) {
  const keyHex = args.key as string;
  if (!keyHex) {
    console.error("Error: Secret key is required (-k).");
    Deno.exit(1);
  }

  const secretKey = fromHex(keyHex);
  const signingKp: KeyPair = {
    secretKey,
    publicKey: new Uint8Array(32), // Placeholder
  };

  const message = await readAll(Deno.stdin);

  try {
    const signed = await sign(message, signingKp, { armor: args.armor });
    await outputResult(signed);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Signing error:", message);
    Deno.exit(1);
  }
}

async function handleVerify(args: ReturnType<typeof parseArgs>) {
  const senderHex = args.sender as string;
  if (!senderHex) {
    console.error("Error: Sender public key is required (-s).");
    Deno.exit(1);
  }

  const senderKey = fromHex(senderHex);
  const signed = await readAll(Deno.stdin);

  try {
    const inputStr = new TextDecoder().decode(signed);
    const input = inputStr.trim().startsWith("BEGIN SALTPACK")
      ? inputStr
      : signed;

    const result = await verify(input, senderKey);
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

function fromHex(hexString: string): Uint8Array {
  // Remove 0x prefix if present
  const cleanHex = hexString.startsWith("0x") ? hexString.slice(2) : hexString;

  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(2 * i, 2 * i + 2), 16);
  }
  return bytes;
}

if (import.meta.main) {
  cli();
}
