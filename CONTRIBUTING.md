# Contributing to saltpack.js

Thank you for your interest in contributing to saltpack.js! This document
provides guidelines for contributing to the project.

## Development Setup

1. Make sure you have [Deno](https://deno.land/) installed (v1.x or later)
2. Clone the repository:
   ```bash
   git clone https://github.com/kuboon/saltpack.js.git
   cd saltpack.js
   ```

## Development Workflow

### Running Tests

```bash
deno test -P
```

### Linting, Type Checking and Formatting

```bash
deno lint
deno check
deno fmt
```

Use `deno task check:all` for all at once.

## Writing Documentation

All exported APIs must have:

- JSDoc comments with description
- `@param` tags for all parameters
- `@returns` tag for return values
- `@example` blocks showing usage
- `@throws` tags for errors

Example:

````typescript
/**
 * Encrypts a message for recipients.
 *
 * @param plaintext - The message to encrypt
 * @param sender - Sender's key pair
 * @param recipients - Array of recipient public keys
 * @returns Encrypted message
 * @throws Error if no recipients provided
 *
 * @example
 * ```ts
 * const encrypted = await encrypt(msg, sender, [recipient.publicKey]);
 * ```
 */
export async function encrypt(...) {
  // implementation
}
````

## Testing Guidelines

- Write tests for all new features
- Ensure existing tests pass before submitting a PR
- Use descriptive test names
- Follow the existing test structure

## Questions or Issues?

If you have questions or find bugs, please
[open an issue](https://github.com/kuboon/saltpack.js/issues) on GitHub.

## License

By contributing to saltpack.js, you agree that your contributions will be
licensed under the LICENSE file. Note that this MIT License has additional part.
See the LICENSE file for details.
