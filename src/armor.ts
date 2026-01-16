/**
 * ASCII Armor encoding and decoding for Saltpack messages
 *
 * Saltpack messages can be encoded in an ASCII-armored format similar to PGP.
 * Format:
 * BEGIN SALTPACK [TYPE] MESSAGE.
 * [base64-encoded data in 43-character blocks]
 * END SALTPACK [TYPE] MESSAGE.
 */

const ARMOR_HEADER_ENCRYPTION = "BEGIN SALTPACK ENCRYPTED MESSAGE.";
const ARMOR_FOOTER_ENCRYPTION = "END SALTPACK ENCRYPTED MESSAGE.";
const ARMOR_HEADER_SIGNED = "BEGIN SALTPACK SIGNED MESSAGE.";
const ARMOR_FOOTER_SIGNED = "END SALTPACK SIGNED MESSAGE.";

const BLOCK_SIZE = 43; // Characters per line in armored output

/**
 * Encodes Uint8Array to base64 string
 */
function encodeBase64(data: Uint8Array): string {
  const bytes = [];
  for (let i = 0; i < data.length; i++) {
    bytes.push(String.fromCharCode(data[i]));
  }
  return btoa(bytes.join(""));
}

/**
 * Decodes base64 string to Uint8Array
 */
function decodeBase64(str: string): Uint8Array {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encodes binary data into ASCII-armored Saltpack format
 *
 * @param data - The binary data to encode
 * @param messageType - The type of message ("ENCRYPTED" or "SIGNED")
 * @returns ASCII-armored string
 *
 * @example
 * ```ts
 * const data = new Uint8Array([1, 2, 3, 4]);
 * const armored = armor(data, "ENCRYPTED");
 * console.log(armored);
 * // BEGIN SALTPACK ENCRYPTED MESSAGE.
 * // ...encoded data...
 * // END SALTPACK ENCRYPTED MESSAGE.
 * ```
 */
export function armor(
  data: Uint8Array,
  messageType: "ENCRYPTED" | "SIGNED",
): string {
  const encoded = encodeBase64(data);

  // Split into blocks of BLOCK_SIZE characters
  const blocks: string[] = [];
  for (let i = 0; i < encoded.length; i += BLOCK_SIZE) {
    blocks.push(encoded.slice(i, i + BLOCK_SIZE));
  }

  const header = messageType === "ENCRYPTED"
    ? ARMOR_HEADER_ENCRYPTION
    : ARMOR_HEADER_SIGNED;
  const footer = messageType === "ENCRYPTED"
    ? ARMOR_FOOTER_ENCRYPTION
    : ARMOR_FOOTER_SIGNED;

  return [header, ...blocks, footer].join("\n");
}

/**
 * Decodes ASCII-armored Saltpack format into binary data
 *
 * @param armoredData - The ASCII-armored string to decode
 * @returns Decoded binary data
 * @throws Error if the armor format is invalid
 *
 * @example
 * ```ts
 * const armored = "BEGIN SALTPACK ENCRYPTED MESSAGE.\nABCD...\nEND SALTPACK ENCRYPTED MESSAGE.";
 * const data = dearmor(armored);
 * ```
 */
export function dearmor(armoredData: string): Uint8Array {
  const lines = armoredData.trim().split("\n");

  if (lines.length < 3) {
    throw new Error("Invalid armored data: too few lines");
  }

  const header = lines[0];
  const footer = lines[lines.length - 1];

  // Validate header and footer
  if (
    !header.startsWith("BEGIN SALTPACK") ||
    !footer.startsWith("END SALTPACK")
  ) {
    throw new Error("Invalid armored data: missing header or footer");
  }

  // Extract the data lines (everything between header and footer)
  const dataLines = lines.slice(1, -1);
  const encoded = dataLines.join("");

  try {
    return decodeBase64(encoded);
  } catch (error) {
    throw new Error(`Failed to decode armored data: ${error}`);
  }
}
