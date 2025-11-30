import type { JSCodeshift, Collection, MemberExpression, Identifier } from 'jscodeshift';
import type { ValidationError } from '../types';
import { ValidationRule, createValidationError } from './validator-types';

/**
 * Check 3: Ensure .compile() calls are awaited
 *
 * Severity: Warning
 *
 * The .compile() method returns a Promise, so it should be awaited.
 * Not awaiting it may cause issues in test setup.
 *
 * @example
 * // ❌ INVALID
 * const unitRef = TestBed.solitary(MyService).compile();
 *
 * // ✅ VALID
 * const unitRef = await TestBed.solitary(MyService).compile();
 */
export function validateCompileAwaited(
  j: JSCodeshift,
  root: Collection,
  source: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Find all .compile() calls
  root
    .find(j.CallExpression)
    .forEach((path) => {
      const node = path.node;
      const callee = node.callee;

      // Check if it's a .compile() call
      if (callee.type !== 'MemberExpression') return;

      const memberExpr = callee as MemberExpression;
      const property = memberExpr.property;

      if (
        property.type === 'Identifier' &&
        (property as Identifier).name !== 'compile'
      )
        return;

      // Check if parent is AwaitExpression
      const parent = path.parent?.node;
      const isAwaited = parent?.type === 'AwaitExpression';

      if (!isAwaited) {
        errors.push(
          createValidationError(
            ValidationRule.COMPILE_AWAITED,
            '.compile() should be awaited: await TestBed.solitary(...).compile()',
            'warning',
            path
          )
        );
      }
    });

  return errors;
}
