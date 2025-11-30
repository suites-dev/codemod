import type { JSCodeshift, Collection, CallExpression, MemberExpression, Identifier } from 'jscodeshift';
import type { ValidationError } from '../types';
import { ValidationRule, createValidationError } from './validator-types';
import { detectRetrievals } from '../analyzers/retrieval-detector';

/**
 * Check 5: CRITICAL - Ensure dependencies with .final() are not retrieved via unitRef.get()
 *
 * Severity: Critical
 *
 * This is the most severe error as it will cause runtime failures.
 * Dependencies configured with .final() are sealed and cannot be retrieved
 * or modified after compilation.
 *
 * @example
 * // ❌ INVALID - Will fail at runtime
 * const unitRef = await TestBed
 *   .solitary(MyService)
 *   .mock(HttpClient).final({ get: () => 'data' })
 *   .compile();
 * const http = unitRef.get(HttpClient);  // Error!
 *
 * // ✅ VALID - Use .impl() for retrieved dependencies
 * const unitRef = await TestBed
 *   .solitary(MyService)
 *   .mock(HttpClient).impl(stubFn => ({ get: stubFn() }))
 *   .compile();
 * const http = unitRef.get(HttpClient);  // OK
 */
export function validateNoFinalRetrieval(
  j: JSCodeshift,
  root: Collection,
  _source: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Step 1: Collect all dependencies marked with .final()
  const finalDependencies = new Set<string>();

  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'final' },
      },
    })
    .forEach((finalPath) => {
      // Get the preceding .mock() call
      const mockCall = findPrecedingMockCall(j, finalPath);

      if (mockCall && mockCall.arguments && mockCall.arguments.length > 0) {
        const depName = extractDependencyName(mockCall.arguments[0]);
        if (depName) {
          finalDependencies.add(depName);
        }
      }
    });

  // Step 2: Find all unitRef.get() retrievals using existing analyzer
  const retrievedDeps = detectRetrievals(j, root);

  // Step 3: Find intersection - these are CRITICAL ERRORS
  retrievedDeps.forEach((depName) => {
    if (finalDependencies.has(depName)) {
      // Find the unitRef.get() call for better error reporting
      root
        .find(j.CallExpression, {
          callee: {
            type: 'MemberExpression',
            property: { name: 'get' },
          },
        })
        .forEach((getPath) => {
          const args = getPath.node.arguments;
          if (args && args.length > 0) {
            const argName = extractDependencyName(args[0]);
            if (argName === depName) {
              errors.push(
                createValidationError(
                  ValidationRule.NO_FINAL_RETRIEVAL,
                  `CRITICAL: Dependency '${depName}' is configured with .final() but retrieved with unitRef.get(). ` +
                    `Use .impl() instead of .final() for retrieved dependencies.`,
                  'critical',
                  getPath
                )
              );
            }
          }
        });
    }
  });

  return errors;
}

/**
 * Helper: Find the preceding .mock() call in the chain
 * Example: TestBed.solitary(X).mock(Y).final(Z)
 *          Returns the .mock(Y) call node
 */
function findPrecedingMockCall(
  j: JSCodeshift,
  finalPath: any
): CallExpression | null {
  const callee = finalPath.node.callee;

  if (callee.type !== 'MemberExpression') return null;

  const memberExpr = callee as MemberExpression;
  const object = memberExpr.object;

  if (object.type !== 'CallExpression') return null;

  const prevCallExpr = object as CallExpression;
  const prevCallee = prevCallExpr.callee;

  if (prevCallee.type !== 'MemberExpression') return null;

  const prevMemberExpr = prevCallee as MemberExpression;
  const prevProperty = prevMemberExpr.property;

  if (
    prevProperty.type === 'Identifier' &&
    (prevProperty as Identifier).name === 'mock'
  ) {
    return prevCallExpr;
  }

  return null;
}

/**
 * Helper: Extract dependency name from AST node
 * Handles both identifier and string literal arguments
 */
function extractDependencyName(node: any): string | null {
  if (!node) return null;

  // Handle identifier: .mock(UserRepository)
  if (node.type === 'Identifier') {
    return (node as Identifier).name;
  }

  // Handle string literal: .mock('API_KEY')
  if (node.type === 'StringLiteral' || node.type === 'Literal') {
    const value = node.value;
    return typeof value === 'string' ? value : null;
  }

  // Handle arguments array - get first argument
  if (Array.isArray(node) && node.length > 0) {
    return extractDependencyName(node[0]);
  }

  return null;
}
