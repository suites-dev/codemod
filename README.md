# @suites/codemod

Automated migration tool from Automock to Suites.

## Status

🚧 **Work in Progress** - This package is currently under development.

**Phase 1 (Foundation)**: ✅ Complete
**Phase 2 (Analysis Layer)**: ⏳ In Progress
**Phase 3 (Core Transformations)**: ⏳ Pending
**Phase 4 (Complex Transformations)**: ⏳ Pending
**Phase 5 (Validation & Polish)**: ⏳ Pending
**Phase 6 (Documentation & Release)**: ⏳ Pending

## Overview

This package provides an automated codemod for migrating Automock test code to Suites. It handles:

- Import transformations (`@automock/*` → `@suites/unit`)
- TestBed API changes (`.create()` → `.solitary()`, async compile)
- Mock configuration transformations (`.using()` → `.impl()` or `.final()`)
- Type transformations (`jest.Mocked<T>` → `Mocked<T>`)
- Cleanup of obsolete code patterns

## Installation

```bash
# Run with npx (no installation required)
npx @suites/codemod [path] [options]

# Or install globally
npm install -g @suites/codemod
```

## Usage

```bash
# Interactive mode (default) - prompts for ambiguous transformations
npx @suites/codemod ./src

# Automated mode - best-effort transformations, no prompts
npx @suites/codemod ./src --auto

# Dry run - preview changes only
npx @suites/codemod ./src --dry-run

# Single file migration
npx @suites/codemod ./src/user.service.spec.ts

# Ignore patterns
npx @suites/codemod ./src --ignore "**/*.e2e.ts,**/fixtures/**"
```

## Options

```
Options:
  -a, --auto                 Disable interactive mode (auto-transform)
  -d, --dry-run              Preview changes without writing files
  -p, --parser <parser>      Parser to use (tsx, ts, babel) [default: tsx]
  -e, --extensions <exts>    File extensions [default: .ts,.tsx]
  -i, --ignore <patterns>    Ignore file patterns
  --skip-validation          Skip TypeScript validation after transform
  -v, --verbose              Show detailed transformation logs
  --version                  Display version
  --help                     Display help
```

## Features

### Interactive Mode (Default)

When the codemod encounters ambiguous transformations, it will prompt you for decisions:

```
❓ Interactive Decisions

   File: src/services/payment.service.spec.ts

   Mock configuration for PaymentGateway:
   ? Choose strategy: (Use arrow keys)
   ❯ .impl() - Retrievable mock (use if you call unitRef.get())
     .final() - Immutable mock (simpler, but not retrievable)

   Recommendation: .impl() (detected unitRef.get() call on line 45)
```

### TypeScript Validation

After transformation, the codemod validates that your code compiles successfully:

```
✅ Validating TypeScript...
   ✓ All files compile successfully
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
npm install

# Build
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Lint with auto-fix
npm run lint:fix
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Omer Morad](https://github.com/omermorad)
