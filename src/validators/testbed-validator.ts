import type { JSCodeshift, Collection, MemberExpression, Identifier } from 'jscodeshift';
import type { ValidationError } from '../types';
import { ValidationRule, createValidationError } from './validator-types';

/**
 * Check 2: Ensure TestBed.create() is transformed to TestBed.solitary()
 *
 * Severity: Error
 *
 * The old Automock API used TestBed.create(), which should be
 * transformed to TestBed.solitary() in the new Suites API.
 *
 * @example
 * // ❌ INVALID
 * const unitRef = await TestBed.create(MyService).compile();
 *
 * // ✅ VALID
 * const unitRef = await TestBed.solitary(MyService).compile();
 */
export function validateTestBedTransformed(
  j: JSCodeshift,
  root: Collection,
  _source: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Find all CallExpressions
  root
    .find(j.CallExpression)
    .forEach((path) => {
      const node = path.node;
      const callee = node.callee;

      // Check if it's a member expression
      if (callee.type !== 'MemberExpression') return;

      const memberExpr = callee as MemberExpression;
      const object = memberExpr.object;
      const property = memberExpr.property;

      // Check if it's TestBed.create()
      if (
        object.type === 'Identifier' &&
        (object as Identifier).name === 'TestBed' &&
        property.type === 'Identifier' &&
        (property as Identifier).name === 'create'
      ) {
        errors.push(
          createValidationError(
            ValidationRule.TESTBED_TRANSFORMED,
            'TestBed.create() should be transformed to TestBed.solitary()',
            'error',
            path
          )
        );
      }
    });

  return errors;
}
