# Contributing to saltpack.js

Thank you for your interest in contributing to saltpack.js! This document provides guidelines for contributing to the project.

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

To check formatting without making changes:

```bash
deno fmt --check
```

### Type Checking

```bash
deno check mod.ts
```

## Code Style

- Follow the existing code style in the project
- Use TypeScript for all new code
- Add JSDoc comments to all exported functions and types
- Keep line length under 100 characters
- Use 2 spaces for indentation

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

## Pull Request Process

1. Fork the repository
2. Create a new branch for your feature: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests and linting: `deno test && deno lint && deno fmt --check`
5. Commit your changes with a clear message
6. Push to your fork
7. Open a Pull Request

## Commit Messages

- Use clear, descriptive commit messages
- Start with a verb in present tense (e.g., "Add", "Fix", "Update")
- Keep the first line under 72 characters
- Add detailed description if needed

Examples:

- `Add support for detached signatures`
- `Fix encryption for anonymous senders`
- `Update documentation for verify function`

## Questions or Issues?

If you have questions or find bugs, please [open an issue](https://github.com/kuboon/saltpack.js/issues) on GitHub.

## License

By contributing to saltpack.js, you agree that your contributions will be licensed under the MIT License.
