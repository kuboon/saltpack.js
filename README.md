# saltpack.js

A modern JavaScript/TypeScript implementation of the
[Saltpack](https://saltpack.org/) encrypted messaging format for Deno and other
JavaScript runtimes.

[![JSR](https://jsr.io/badges/@kuboon/saltpack)](https://jsr.io/@kuboon/saltpack)
[![JSR Score](https://jsr.io/badges/@kuboon/saltpack/score)](https://jsr.io/@kuboon/saltpack)

## What is Saltpack?

Saltpack is a modern cryptographic message format designed for encryption and
signing, providing better security and usability than legacy formats like PGP.
It features:

- **Modern cryptography**: Uses NaCl's box and secretbox primitives (Curve25519,
  XSalsa20, Poly1305)
- **Streaming support**: Handles large messages efficiently with 1 MiB chunks
- **Multiple recipients**: Encrypt to multiple recipients with a single message
- **Authenticated encryption**: Only outputs authenticated bytes
- **Simple and safe**: Designed to avoid common cryptographic pitfalls

## CLI

This package provides a simple CLI wrapper:

```bash
# Encrypt
echo "hello" | deno run jsr:@kuboon/saltpack encrypt -r <hex-recipient-public-key>

# Decrypt
cat encrypted.msg | deno run jsr:@kuboon/saltpack decrypt -k <hex-recipient-secret-key>

# Sign
echo "hello" | deno run jsr:@kuboon/saltpack sign -k <hex-signing-secret-key>

# Verify
cat signed.msg | deno run jsr:@kuboon/saltpack verify -s <hex-sender-public-key>
```

Options:

- `-r, --recipient`: Recipient public key (hex)
- `-s, --sender`: Sender public key (hex) for verification
- `-k, --key`: Secret key (hex) for decryption or signing
- `-a, --armor`: Output ASCII armored data (default: true)

## Installation

### Deno

```typescript
import { decrypt, encrypt, sign, verify } from "@kuboon/saltpack";
```

### Node.js / npm

```bash
npx jsr add @kuboon/saltpack
```

```typescript
import { decrypt, encrypt, sign, verify } from "@kuboon/saltpack";
```

## Quick Start

### Encryption and Decryption

```typescript
import { decrypt, encrypt, generateKeyPair } from "@kuboon/saltpack";

// Generate key pairs
const sender = generateKeyPair();
const recipient = generateKeyPair();

// Encrypt a message
const plaintext = new TextEncoder().encode("Hello, Saltpack!");
const encrypted = await encrypt(plaintext, sender, [recipient.publicKey], {
  armor: true,
});

// Decrypt the message
const result = await decrypt(encrypted, recipient);
const decryptedText = new TextDecoder().decode(result.plaintext);
console.log(decryptedText); // "Hello, Saltpack!"
```

### Signing and Verification

```typescript
import { generateSigningKeyPair, sign, verify } from "@kuboon/saltpack";

// Generate signing key pair
const keyPair = generateSigningKeyPair();

// Sign a message
const message = new TextEncoder().encode("Important message");
const signed = await sign(message, keyPair, { armor: true });

// Verify the signature
const result = await verify(signed, keyPair.publicKey);
if (result.verified) {
  const originalMessage = new TextDecoder().decode(result.message);
  console.log("Verified:", originalMessage);
}
```

## API Reference

### Encryption

#### `encrypt(plaintext, senderKeyPair, recipientPublicKeys, options?)`

Encrypts a message for one or more recipients.

- `plaintext: Uint8Array` - The message to encrypt
- `senderKeyPair: KeyPair | null` - Sender's key pair (null for anonymous)
- `recipientPublicKeys: PublicKey[]` - Array of recipient public keys
- `options?: { armor?: boolean }` - Options (set armor to true for ASCII output)
- Returns: `Promise<Uint8Array | string>` - Encrypted message

#### `decrypt(encrypted, recipientKeyPair)`

Decrypts a Saltpack encrypted message.

- `encrypted: Uint8Array | string` - The encrypted message
- `recipientKeyPair: KeyPair` - Recipient's key pair
- Returns: `Promise<DecryptionResult>` - Contains plaintext and optional sender
  public key

### Signing

#### `sign(message, signingKeyPair, options?)`

Signs a message using attached signing format.

- `message: Uint8Array` - The message to sign
- `signingKeyPair: KeyPair` - Signer's Ed25519 key pair
- `options?: { armor?: boolean }` - Options (set armor to true for ASCII output)
- Returns: `Promise<Uint8Array | string>` - Signed message

#### `verify(signedMessage, signerPublicKey)`

Verifies a signed message.

- `signedMessage: Uint8Array | string` - The signed message
- `signerPublicKey: PublicKey` - Expected signer's public key
- Returns: `Promise<VerificationResult>` - Contains message, sender public key,
  and verification status

### Key Generation

#### `generateKeyPair()`

Generates a new key pair for encryption/decryption (X25519).

- Returns: `KeyPair` - Contains publicKey and secretKey

#### `generateSigningKeyPair()`

Generates a new key pair for signing/verification (Ed25519).

- Returns: `KeyPair` - Contains publicKey and secretKey

### Armor

#### `armor(data, messageType)`

Encodes binary data into ASCII-armored format.

- `data: Uint8Array` - Binary data to encode
- `messageType: "ENCRYPTED" | "SIGNED"` - Type of message
- Returns: `string` - ASCII-armored message

#### `dearmor(armoredData)`

Decodes ASCII-armored data into binary.

- `armoredData: string` - ASCII-armored message
- Returns: `Uint8Array` - Binary data

## Development

### Prerequisites

- Deno 1.x or later

### Running Tests

```bash
deno test --allow-read --allow-write
```

### Linting

```bash
deno lint
```

### Formatting

```bash
deno fmt
```

### Type Checking

```bash
deno check mod.ts
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Specification

This implementation follows the Saltpack specification:

- [Encryption Format v2](https://saltpack.org/encryption-format-v2)
- [Signing Format v2](https://saltpack.org/signing-format-v2)

## Related Projects

- [saltpack (Go)](https://github.com/keybase/saltpack) - Reference
  implementation
- [Keybase](https://keybase.io/) - Uses Saltpack for secure messaging

## Acknowledgments

Saltpack was designed by the Keybase team. This is an independent
JavaScript/TypeScript implementation.
