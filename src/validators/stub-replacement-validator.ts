import type { JSCodeshift, Collection } from 'jscodeshift';
import type { ValidationError } from '../types';
import { ValidationRule, createValidationError } from './validator-types';
import { isJestFn, isSinonStub } from '../utils/ast-helpers';

/**
 * Check 6: Ensure jest.fn() and sinon.stub() are replaced with stubFn()
 *
 * Severity: Error
 *
 * In Suites, stub creation should use the provided stubFn() helper
 * instead of jest.fn() or sinon.stub(). This ensures framework-agnostic
 * stub creation.
 *
 * @example
 * // ❌ INVALID
 * TestBed.solitary(MyService)
 *   .mock(Dep)
 *   .impl(() => ({ method: jest.fn() }))
 *
 * // ✅ VALID
 * TestBed.solitary(MyService)
 *   .mock(Dep)
 *   .impl(stubFn => ({ method: stubFn() }))
 */
export function validateStubsReplaced(
  j: JSCodeshift,
  root: Collection,
  source: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Find all CallExpressions
  root
    .find(j.CallExpression)
    .forEach((path) => {
      const node = path.node;

      // Check if it's jest.fn()
      if (isJestFn(node)) {
        errors.push(
          createValidationError(
            ValidationRule.STUBS_REPLACED,
            'jest.fn() should be replaced with stubFn() inside .impl() callbacks',
            'error',
            path
          )
        );
      }

      // Check if it's sinon.stub()
      if (isSinonStub(node)) {
        errors.push(
          createValidationError(
            ValidationRule.STUBS_REPLACED,
            'sinon.stub() should be replaced with stubFn() inside .impl() callbacks',
            'error',
            path
          )
        );
      }
    });

  return errors;
}
