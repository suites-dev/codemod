import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load a fixture file from the __fixtures__ directory
 */
export function loadFixture(fixtureName: string, fileName: 'input.ts' | 'output.ts'): string {
  const fixturePath = join(__dirname, '../../__fixtures__', fixtureName, fileName);
  return readFileSync(fixturePath, 'utf-8');
}

/**
 * Load both input and output fixtures
 */
export function loadFixturePair(fixtureName: string): { input: string; output: string } {
  return {
    input: loadFixture(fixtureName, 'input.ts'),
    output: loadFixture(fixtureName, 'output.ts'),
  };
}

/**
 * Normalize whitespace for comparison
 * Removes leading/trailing whitespace and normalizes line endings
 */
export function normalizeCode(code: string): string {
  return code
    .trim()
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\s+$/gm, '') // Remove trailing whitespace per line
    .replace(/^\s+/gm, (match) => match.replace(/\t/g, '  ')); // Normalize tabs to spaces
}

/**
 * Compare two code strings ignoring whitespace differences
 */
export function compareCode(actual: string, expected: string): boolean {
  return normalizeCode(actual) === normalizeCode(expected);
}
