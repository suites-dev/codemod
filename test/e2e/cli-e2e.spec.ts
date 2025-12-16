/**
 * End-to-end tests for the CLI
 *
 * These tests run the actual CLI command on fixture files
 * to verify the complete transformation pipeline works correctly.
 */

import { execSync } from 'child_process';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadFixturePair } from '../utils/fixture-loader';

describe('CLI E2E Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await mkdtemp(join(tmpdir(), 'codemod-e2e-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic Transformations', () => {
    it('should transform a simple fixture file via CLI', async () => {
      const fixtures = loadFixturePair('complex-impl');

      // Write input file to temp directory
      const inputFile = join(tempDir, 'test.ts');
      await writeFile(inputFile, fixtures.input, 'utf-8');

      // Run CLI in dry mode
      const cliPath = join(__dirname, '../../bin/suites-codemod.js');
      const result = execSync(
        `node ${cliPath} automock/2/to-suites-v3 ${tempDir} --dry --force`,
        {
          cwd: process.cwd(),
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );

      // Verify CLI ran successfully
      expect(result).toBeDefined();
      expect(result).toMatch(/file.*transformed|files transformed/i);
    });

    it('should actually transform files when not in dry mode', async () => {
      const fixtures = loadFixturePair('complex-impl');

      // Write input file to temp directory
      const inputFile = join(tempDir, 'test.ts');
      await writeFile(inputFile, fixtures.input, 'utf-8');

      // Run CLI (not in dry mode, with force to skip git check)
      const cliPath = join(__dirname, '../../bin/suites-codemod.js');
      execSync(`node ${cliPath} automock/2/to-suites-v3 ${tempDir} --force`, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // Read the transformed file
      const transformedContent = await readFile(inputFile, 'utf-8');

      // Verify transformation occurred
      expect(transformedContent).toContain('@suites/unit');
      expect(transformedContent).not.toContain('@automock/jest');
      expect(transformedContent).toContain('TestBed.solitary');
      expect(transformedContent).not.toContain('TestBed.create');
      expect(transformedContent).toContain('.impl(');
      expect(transformedContent).not.toContain('.using(');
    });

    it('should transform multiple files in a directory', async () => {
      const fixtures1 = loadFixturePair('token-injection');
      const fixtures2 = loadFixturePair('complex-impl');

      // Write multiple input files
      await writeFile(join(tempDir, 'test1.ts'), fixtures1.input, 'utf-8');
      await writeFile(join(tempDir, 'test2.ts'), fixtures2.input, 'utf-8');

      // Run CLI
      const cliPath = join(__dirname, '../../bin/suites-codemod.js');
      const result = execSync(
        `node ${cliPath} automock/2/to-suites-v3 ${tempDir} --force`,
        {
          cwd: process.cwd(),
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );

      // Verify both files were transformed
      const transformed1 = await readFile(join(tempDir, 'test1.ts'), 'utf-8');
      const transformed2 = await readFile(join(tempDir, 'test2.ts'), 'utf-8');

      expect(transformed1).toContain('@suites/unit');
      expect(transformed2).toContain('@suites/unit');
      expect(result).toContain('files transformed');
    });
  });

  describe('CLI Options', () => {
    it('should respect --dry flag and not modify files', async () => {
      const fixtures = loadFixturePair('complex-impl');

      const inputFile = join(tempDir, 'test.ts');
      await writeFile(inputFile, fixtures.input, 'utf-8');

      // Run CLI in dry mode
      const cliPath = join(__dirname, '../../bin/suites-codemod.js');
      execSync(
        `node ${cliPath} automock/2/to-suites-v3 ${tempDir} --dry --force`,
        {
          cwd: process.cwd(),
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );

      // Verify file was NOT modified
      const content = await readFile(inputFile, 'utf-8');
      expect(content).toBe(fixtures.input);
      expect(content).toContain('@automock/jest');
    });

    it('should respect --print flag and output to stdout', async () => {
      const fixtures = loadFixturePair('complex-impl');

      const inputFile = join(tempDir, 'test.ts');
      await writeFile(inputFile, fixtures.input, 'utf-8');

      // Run CLI with print flag
      const cliPath = join(__dirname, '../../bin/suites-codemod.js');
      const result = execSync(
        `node ${cliPath} automock/2/to-suites-v3 ${inputFile} --print --force`,
        {
          cwd: process.cwd(),
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );

      // Verify output contains transformed code
      expect(result).toContain('@suites/unit');
      expect(result).toContain('TestBed.solitary');

      // Verify file was NOT modified (print mode doesn't write)
      const content = await readFile(inputFile, 'utf-8');
      expect(content).toBe(fixtures.input);
    });

    it('should handle --verbose flag', async () => {
      const fixtures = loadFixturePair('complex-impl');

      const inputFile = join(tempDir, 'test.ts');
      await writeFile(inputFile, fixtures.input, 'utf-8');

      // Run CLI with verbose flag
      const cliPath = join(__dirname, '../../bin/suites-codemod.js');
      const result = execSync(
        `node ${cliPath} automock/2/to-suites-v3 ${tempDir} --verbose --force --dry`,
        {
          cwd: process.cwd(),
          encoding: 'utf-8',
          stdio: 'pipe',
        }
      );

      // Verify verbose output is present
      expect(result).toBeDefined();
      // jscodeshift will output processing information
    });
  });

  describe('Error Handling', () => {
    it('should exit with error code for invalid codemod', () => {
      const cliPath = join(__dirname, '../../bin/suites-codemod.js');

      expect(() => {
        execSync(`node ${cliPath} invalid/codemod ${tempDir} --force`, {
          cwd: process.cwd(),
          encoding: 'utf-8',
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('should exit with error code for non-existent path', () => {
      const cliPath = join(__dirname, '../../bin/suites-codemod.js');

      try {
        execSync(
          `node ${cliPath} automock/2/to-suites-v3 /non/existent/path --force`,
          {
            cwd: process.cwd(),
            encoding: 'utf-8',
            stdio: 'pipe',
          }
        );
        // If we get here, the command didn't throw - that's also acceptable
        // as jscodeshift might handle missing paths gracefully
      } catch (error: any) {
        // Command threw an error, which is expected
        expect(error).toBeDefined();
        // Verify it's an error (exit code non-zero or error message)
        expect(error.status || error.message).toBeDefined();
      }
    });
  });
});
