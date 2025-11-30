import type { JSCodeshift, Collection } from 'jscodeshift';
import type { ValidationError } from '../types';
import { ValidationRule, createValidationError } from './validator-types';

/**
 * Check 4: Ensure .using() is transformed to .impl() or .final()
 *
 * Severity: Error
 *
 * The old Automock API used .using() for mock configuration,
 * which should be transformed to .impl() or .final() based on
 * whether the mock needs to be retrieved later.
 *
 * @example
 * // ❌ INVALID
 * TestBed.solitary(MyService).mock(Dep).using({ method: jest.fn() })
 *
 * // ✅ VALID - Use .impl() for retrieved dependencies
 * TestBed.solitary(MyService).mock(Dep).impl(stubFn => ({ method: stubFn() }))
 *
 * // ✅ VALID - Use .final() for non-retrieved dependencies
 * TestBed.solitary(MyService).mock(Dep).final({ method: () => 'result' })
 */
export function validateUsingTransformed(
  j: JSCodeshift,
  root: Collection,
  source: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Find all CallExpressions with .using() method
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'using' },
      },
    })
    .forEach((path) => {
      errors.push(
        createValidationError(
          ValidationRule.USING_TRANSFORMED,
          '.using() should be transformed to .impl() or .final()',
          'error',
          path
        )
      );
    });

  return errors;
}
