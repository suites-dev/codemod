# @suites/codemod

Code transformation tool for the Suites testing framework.

## Overview

A powerful codemod library for transforming Suites-based test code. Currently supports:

- **automock-to-suites**: Migrate from Automock to Suites unit testing framework
- Future transforms for Suites version migrations (e.g., v3 → v4)

## Installation

```bash
# Run with npx (no installation required)
npx @suites/codemod <transform> <path> [options]

# Or install globally
npm install -g @suites/codemod
```

## Usage

### Basic Usage

```bash
# Migrate from Automock to Suites
npx @suites/codemod automock-to-suites ./src

# For backward compatibility, transform defaults to automock-to-suites
npx @suites/codemod ./src
```

### List Available Transforms

```bash
npx @suites/codemod --list-transforms
```

### Common Options

```bash
# Dry run - preview changes without writing files
npx @suites/codemod automock-to-suites ./src --dry-run

# Skip validation checks
npx @suites/codemod automock-to-suites ./src --skip-validation

# Verbose output
npx @suites/codemod automock-to-suites ./src --verbose

# Single file migration
npx @suites/codemod automock-to-suites ./src/user.service.spec.ts

# Ignore patterns
npx @suites/codemod automock-to-suites ./src --ignore "**/*.e2e.ts,**/fixtures/**"
```

## Available Transforms

### `automock-to-suites`

Migrates code from the Automock testing framework to Suites. Handles:

- Import transformations (`@automock/*` → `@suites/unit`)
- TestBed API changes (`.create()` → `.solitary()`, async compile)
- Mock configuration transformations (`.using()` → `.impl()` or `.final()`)
- Type transformations (`jest.Mocked<T>` → `Mocked<T>`)
- Cleanup of obsolete code patterns
- Post-transformation validation

**Example:**
```bash
npx @suites/codemod automock-to-suites ./src
```

## CLI Options

```
Arguments:
  [transform]                Transform to apply (defaults to automock-to-suites)
  [path]                     Path to transform (file or directory) [default: .]

Options:
  -d, --dry-run              Preview changes without writing files
  -f, --force                Bypass git safety checks
  -p, --parser <parser>      Parser to use (tsx, ts, babel) [default: tsx]
  -e, --extensions <exts>    File extensions [default: .ts,.tsx]
  -i, --ignore <patterns>    Ignore file patterns (comma-separated)
  --print                    Print transformed output to stdout
  --skip-validation          Skip post-transformation validation checks
  -v, --verbose              Show detailed transformation logs
  --list-transforms          List all available transforms
  --version                  Display version
  --help                     Display help
```

## Features

### Post-Transformation Validation

After transformation, the codemod validates your code and reports issues:

```
✅ Validation passed
   ✓ All transformations completed successfully
```

### Git Safety Checks

Automatically checks for uncommitted changes before transforming:

```
⚠️  Git directory is not clean
Please commit or stash your changes before running the codemod.
Use --force to bypass this check.
```

### Comprehensive Reporting

Get detailed information about what was transformed:

```
✅ Migration complete!
   15 files transformed
   42 imports updated
   18 mocks configured
   0 errors
```

## Transformation Rules

The codemod implements these transformation rules:

### Rule A: Import Transformations

- `@automock/jest` → `@suites/unit`
- `@automock/sinon` → `@suites/unit`
- `@automock/core` → `@suites/unit`
- `jest.Mocked<T>` → `Mocked<T>` (in Suites context)
- `SinonStubbedInstance<T>` → `Mocked<T>` (in Suites context)

### Rule B: TestBed API Transformations

- `TestBed.create()` → `TestBed.solitary()`
- Add `await` to `.compile()` calls
- Make parent functions `async`

### Rule C: Mock Configuration Transformations

- `.mock().using()` → `.mock().impl()` (if mock is retrieved or uses stubs)
- `.mock().using()` → `.mock().final()` (if mock is not retrieved)
- `jest.fn()` → `stubFn()`
- `sinon.stub()` → `stubFn()`

### Rule D: Cleanup Transformations

- Remove `as jest.Mocked<T>` type casts
- Remove `as SinonStubbedInstance<T>` type casts

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Run tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Lint
pnpm run lint

# Lint with auto-fix
pnpm run lint:fix
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and releases.

```bash
# Examples
feat: add new transformation rule
fix: resolve import path issue
docs: update usage examples
```

See [RELEASE.md](papers/RELEASE.md) for detailed release process documentation.

## Release

This package uses **semantic-release** for automated versioning and publishing. Releases are automatically triggered when commits are pushed to `master` or `next` branches.

For more information, see [RELEASE.md](papers/RELEASE.md).

## License

MIT © [Omer Morad](https://github.com/omermorad)
