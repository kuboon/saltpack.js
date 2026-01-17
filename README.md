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
# Generate keys
deno run jsr:@kuboon/saltpack keygen

# Encrypt
echo "hello" | deno run jsr:@kuboon/saltpack encrypt -k <hex-recipient-public-key>
# uses SALTPACK_ENCRYPT_PK

# Decrypt
cat encrypted.msg | deno run jsr:@kuboon/saltpack decrypt -k <hex-recipient-secret-key>
# uses SALTPACK_DECRYPT_SK

# Sign
echo "hello" | deno run jsr:@kuboon/saltpack sign -k <hex-signing-secret-key>
# uses SALTPACK_SIGN_SK

# Verify
cat signed.msg | deno run jsr:@kuboon/saltpack verify -k <hex-sender-public-key>
# uses SALTPACK_VERIFY_PK
```

Options:

- `-k, --key`: Key (hex). Public key for encryption/verification, Secret key for
  decryption/signing.
- `-a, --armor`: Output ASCII armored data (default: true)
- `--json`: Output keys in JSON format (for keygen)

### Key Types

The `keygen` command generates distinct keys for encryption and signing:

- `SALTPACK_ENCRYPT_PK`: Public key for **encryption** (share with senders)
- `SALTPACK_DECRYPT_SK`: Secret key for **decryption** (keep private)
- `SALTPACK_VERIFY_PK`: Public key for **verification** (share with recipients)
- `SALTPACK_SIGN_SK`: Secret key for **signing** (keep private)

## Installation

### Browser

```html
<script type="module">
  import { decrypt, encrypt } from "https://jsr.io/@kuboon/saltpack";
</script>
```

### Deno

```bash
deno add jsr:@kuboon/saltpack
```

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
import {
  decryptFromStr,
  encryptToStr,
  generateKeyPair,
} from "@kuboon/saltpack";

// Generate key pairs
const sender = generateKeyPair();
const recipient = generateKeyPair();

// Encrypt a message
const plaintext = new TextEncoder().encode("Hello, Saltpack!");
const encrypted = encryptToStr(plaintext, sender, [recipient.publicKey]);

// Decrypt the message
const result = await decryptFromStr(encrypted, recipient);
const decryptedText = new TextDecoder().decode(result.plaintext);
console.log(decryptedText); // "Hello, Saltpack!"
```

### Signing and Verification

```typescript
import {
  generateSigningKeyPair,
  signToStr,
  verifyFromStr,
} from "@kuboon/saltpack";

// Generate signing key pair
const keyPair = generateSigningKeyPair();

// Sign a message
const message = new TextEncoder().encode("Important message");
const signed = signToStr(message, keyPair);

// Verify the signature
const result = await verifyFromStr(signed, keyPair.publicKey);
if (result.verified) {
  const originalMessage = new TextDecoder().decode(result.message);
  console.log("Verified:", originalMessage);
}
```

## API Reference

### Encryption

#### `encrypt(plaintext, senderKeyPair, recipientPublicKeys)`

Encrypts a message for one or more recipients (binary output).

- `plaintext: Uint8Array` - The message to encrypt
- `senderKeyPair: KeyPair | null` - Sender's key pair (null for anonymous)
- `recipientPublicKeys: PublicKey[]` - Array of recipient public keys
- Returns: `Uint8Array` - Encrypted message

#### `encryptToStr(plaintext, senderKeyPair, recipientPublicKeys)`

Encrypts a message and returns ASCII-armored string.

- Same arguments as `encrypt`
- Returns: `string`

#### `decrypt(encrypted, recipientKeyPair)`

Decrypts a Saltpack encrypted message (binary input).

- `encrypted: Uint8Array` - The encrypted message
- `recipientKeyPair: KeyPair` - Recipient's key pair
- Returns: `Promise<DecryptionResult>` - Contains plaintext and optional sender
  public key

#### `decryptFromStr(encrypted, recipientKeyPair)`

Decrypts a Saltpack encrypted message (string input).

- `encrypted: string` - The armored encrypted message
- Returns: `Promise<DecryptionResult>`

### Signing

#### `sign(message, signingKeyPair)`

Signs a message using attached signing format (binary output).

- `message: Uint8Array` - The message to sign
- `signingKeyPair: KeyPair` - Signer's Ed25519 key pair
- Returns: `Uint8Array` - Signed message

#### `signToStr(message, signingKeyPair)`

Signs a message and returns ASCII-armored string.

- Same arguments as `sign`
- Returns: `string`

#### `verify(signedMessage, signerPublicKey)`

Verifies a signed message (binary input).

- `signedMessage: Uint8Array` - The signed message
- `signerPublicKey: PublicKey` - Expected signer's public key
- Returns: `Promise<VerificationResult>` - Contains message, sender public key,
  and verification status

#### `verifyFromStr(signedMessage, signerPublicKey)`

Verifies a signed message (string input).

- `signedMessage: string` - The armored signed message
- Returns: `Promise<VerificationResult>`

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
deno test -P
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
deno check
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
