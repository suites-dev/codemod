# @suites/codemod

[![npm version](https://img.shields.io/npm/v/@suites/codemod.svg)](https://www.npmjs.com/package/@suites/codemod)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Code transformation toolkit for the Suites testing framework

Automated code transformations for Suites projects. Built on [jscodeshift](https://github.com/facebook/jscodeshift) with intelligent AST-based transformations, built-in validation, and TypeScript-first support.

## Usage

```bash
npx @suites/codemod <transform> <path> [options]
```

**Example:**
```bash
npx @suites/codemod automock/2/to-suites-v3 src/**/*.spec.ts
```

Run with `--dry-run` to preview changes without modifying files.

## Available Transforms

- **`automock/2/to-suites-v3`** - Migrate test files from Automock v2 to Suites v3 testing framework

## Example

### Before (Automock)

```typescript
import { TestBed } from '@automock/jest';

describe('UserService', () => {
  let service: UserService;

  beforeAll(() => {
    const { unit } = TestBed.create(UserService)
      .mock(UserRepository)
      .using({ findById: jest.fn() })
      .compile();
    service = unit;
  });
});
```

### After (Suites)

```typescript
import { TestBed } from '@suites/unit';

describe('UserService', () => {
  let service: UserService;

  beforeAll(async () => {
    const { unit } = await TestBed.solitary(UserService)
      .mock(UserRepository)
      .final({ findById: jest.fn() })
      .compile();
    service = unit;
  });
});
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --dry-run` | Preview changes without writing files | `false` |
| `-f, --force` | Bypass git safety checks | `false` |
| `-p, --parser <parser>` | Parser: `tsx`, `ts`, `babel` | `tsx` |
| `-e, --extensions <exts>` | File extensions to transform | `.ts,.tsx` |
| `-i, --ignore <patterns>` | Ignore file patterns (comma-separated) | - |
| `--print` | Print output to stdout | `false` |
| `-v, --verbose` | Show detailed logs | `false` |
| `--skip-validation` | Skip validation checks | `false` |
| `--list-transforms` | List all available transforms | - |

**More examples:**
```bash
# Preview changes
npx @suites/codemod automock/2/to-suites-v3 src --dry-run

# Ignore certain files
npx @suites/codemod automock/2/to-suites-v3 src --ignore "**/*.integration.ts"

# List all transforms
npx @suites/codemod --list-transforms
```

## Transform Details

### `automock/2/to-suites-v3`

Intelligently migrates Automock v2 test files to Suites v3 framework.

**What it transforms:**
- Import statements: `@automock/jest` -> `@suites/unit`
- TestBed API: `TestBed.create()` -> `TestBed.solitary().compile()`
- Mock configuration: `.using()` -> `.impl()` or `.final()`
- Type annotations: `jest.Mocked<T>` -> `Mocked<T>` from `@suites/unit`
- Async/await: Adds `async`/`await` to test hooks as needed
- Mock retrieval: Intelligently selects `.impl()` vs `.final()` strategy
- Jest globals: Preserves `jest` imports where needed
- Type casts: Removes obsolete type assertions

**Mock Strategy Selection:**

The codemod automatically chooses between `.impl()` and `.final()`:

- **`.impl()`** - Used when mocks are retrieved via `unitRef.get()` and need runtime manipulation (spy assertions, dynamic mock configuration)
- **`.final()`** - Used when mocks are provided as final implementations without retrieval

**Validation:**

Built-in validation ensures:
- No `@automock` imports remain
- `TestBed.create()` is converted to `TestBed.solitary()`
- `.compile()` is called with proper `await`
- Mock strategies are correctly applied
- Retrieved mocks use `.impl()` strategy

## Requirements

- **Node.js**: `^16.10.0 || ^18.12.0 || >=20.0.0`
- **Project Type**: TypeScript or JavaScript
- **Git**: Clean working directory recommended (bypass with `--force`)

## Troubleshooting

**"Working directory is not clean"**
- Commit your changes or use `--force` to bypass

**"No files found"**
- Check your path and file extensions: `--extensions .spec.ts,.test.ts`

**Parser errors**
- Try the babel parser: `--parser babel`

**Validation failed**
- Run with `--verbose` for detailed logs
- Review validation errors in the output
- Use `--skip-validation` to bypass (not recommended)

For more help, see [troubleshooting guide](https://github.com/suites-dev/codemod/issues) or open an issue.

## How It Works

The codemod uses [jscodeshift](https://github.com/facebook/jscodeshift) to:
1. Parse TypeScript/JavaScript into an Abstract Syntax Tree (AST)
2. Apply intelligent transformations (imports, TestBed API, mocks, types)
3. Validate the transformed code
4. Output the result

**TypeScript Support:** First-class support with fallback parser for complex syntax (generics, type guards, decorators, JSX/TSX).

## Contributing

Contributions welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Run tests: `npm test` and linter: `npm run lint`
5. Commit: `git commit -m "feat: add feature"`
6. Push and open a Pull Request

### Adding New Transforms

1. Create transform file in `src/transforms/`
2. Register in `src/transforms/index.ts`
3. Add test fixtures in `fixtures/`
4. Add integration tests in `test/integration/`
5. Update this README

### Project Structure

```
src/
  analyzers/        # Code analysis utilities
  transforms/       # Transform implementations
  validators/       # Post-transform validation
  utils/            # Shared utilities
  cli.ts            # CLI interface
  runner.ts         # Transform runner
  transform.ts      # Main transform logic

test/
  integration/      # Integration tests
  transforms/       # Transform unit tests
  fixtures/         # Test fixtures (before/after)
```

## License

MIT (c) [Omer Morad](https://github.com/omermorad)

## Links

- [Suites Documentation](https://suites.dev)
- [GitHub Repository](https://github.com/suites-dev/codemod)
- [Issue Tracker](https://github.com/suites-dev/codemod/issues)
- [NPM Package](https://www.npmjs.com/package/@suites/codemod)

## Related Projects

- [@suites/unit](https://github.com/suites-dev/suites) - The Suites testing framework
- [jscodeshift](https://github.com/facebook/jscodeshift) - JavaScript codemod toolkit
- [@automock/jest](https://github.com/automock/automock) - Automock testing framework

---

**Need help?** Open an issue on [GitHub](https://github.com/suites-dev/codemod/issues) or check the [Suites documentation](https://suites.dev).
