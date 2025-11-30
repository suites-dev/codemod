import type { JSCodeshift, Collection } from 'jscodeshift';
import type { ValidationError } from '../types';
import { ValidationRule, createValidationError } from './validator-types';

/**
 * Check 1: Ensure all @automock/* imports have been removed
 *
 * Severity: Error
 *
 * All imports from @automock/jest, @automock/sinon, and @automock/core
 * should be transformed to @suites/unit imports.
 *
 * @example
 * // ❌ INVALID
 * import { TestBed } from '@automock/jest';
 *
 * // ✅ VALID
 * import { TestBed } from '@suites/unit';
 */
export function validateNoAutomockImports(
  j: JSCodeshift,
  root: Collection,
  source: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Find any remaining @automock/* imports
  root
    .find(j.ImportDeclaration)
    .forEach((path) => {
      const sourceValue = path.node.source.value as string;

      if (sourceValue.startsWith('@automock/')) {
        errors.push(
          createValidationError(
            ValidationRule.NO_AUTOMOCK_IMPORTS,
            `Import from '${sourceValue}' should be transformed to '@suites/unit'`,
            'error',
            path
          )
        );
      }
    });

  return errors;
}
