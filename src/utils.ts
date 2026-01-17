/**
 * Decodes a hex string to a Uint8Array.
 * If the string starts with known prefixes (e.g., "pkhex_", "skhex_"), they are removed.
 * "0x" prefix is also supported and removed.
 */
export function fromHex(hexString: string): Uint8Array {
  let cleanHex = hexString;

  // Remove prefixes
  if (cleanHex.startsWith("pk_0x")) {
    cleanHex = cleanHex.slice(5);
  } else if (cleanHex.startsWith("sk_0x")) {
    cleanHex = cleanHex.slice(5);
  } else if (cleanHex.startsWith("0x")) {
    cleanHex = cleanHex.slice(2);
  }

  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(cleanHex.substring(2 * i, 2 * i + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error("Invalid hex string");
    }
    bytes[i] = byte;
  }
  return bytes;
}

/**
 * Encodes a Uint8Array to a hex string.
 * @param bytes The bytes to encode.
 * @param prefix Optional prefix to add (e.g., "pkhex_", "skhex_").
 */
export function toHex(bytes: Uint8Array, prefix: string = ""): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return prefix + hex;
}
