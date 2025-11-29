import type { JSCodeshift, Collection } from 'jscodeshift';
import { isUnitRefVariable, extractDependencyName } from '../utils/ast-helpers';

/**
 * Detect all dependencies retrieved via unitRef.get()
 * This is critical for deciding between .impl() and .final()
 *
 * Rule: If a dependency is retrieved, it MUST use .impl()
 */
export function detectRetrievals(
  j: JSCodeshift,
  root: Collection
): Set<string> {
  const retrievedDeps = new Set<string>();

  // Find all CallExpressions with .get() method
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'get' },
      },
    })
    .forEach((path) => {
      const callee = path.value.callee;

      // Check if it's called on a unitRef-like variable
      if (
        callee.type === 'MemberExpression' &&
        isUnitRefVariable(callee.object)
      ) {
        // Extract the dependency being retrieved
        const arg = path.value.arguments[0];
        if (arg) {
          const depName = extractDependencyName(arg);
          if (depName) {
            retrievedDeps.add(depName);
          }
        }
      }
    });

  return retrievedDeps;
}

/**
 * Check if a specific dependency is retrieved
 */
export function isDependencyRetrieved(
  j: JSCodeshift,
  root: Collection,
  dependencyName: string
): boolean {
  const retrievals = detectRetrievals(j, root);
  return retrievals.has(dependencyName);
}

/**
 * Parse source code and detect retrievals
 */
export function detectRetrievalsFromSource(
  j: JSCodeshift,
  source: string
): Set<string> {
  const root = j(source);
  return detectRetrievals(j, root);
}
