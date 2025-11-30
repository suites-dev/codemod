import type { JSCodeshift, Collection } from 'jscodeshift';
import type { AnalysisContext } from '../types';

/**
 * Transform standalone jest.fn() calls to stub()
 *
 * This handles jest.fn() calls that are NOT inside .mock().impl() blocks,
 * such as:
 *   const myStub = jest.fn();
 *   const obj = { method: jest.fn() };
 */
export function transformGlobalJest(
  j: JSCodeshift,
  root: Collection,
  context: AnalysisContext
): void {
  if (!context.isSuitesContext) {
    return;
  }

  let hasStandaloneStubs = false;

  // Find all jest.fn() calls
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 'jest' },
        property: { name: 'fn' },
      },
    })
    .forEach((path) => {
      // Check if this jest.fn() is inside a .mock().impl() block
      // If it is, it will be handled by the mock-transformer
      if (isInsideImplBlock(j, path)) {
        return;
      }

      // Transform standalone jest.fn() to stub()
      const args = path.node.arguments || [];
      path.replace(
        j.callExpression(j.identifier('stub'), args)
      );
      hasStandaloneStubs = true;
    });

  // Add stub import if needed
  if (hasStandaloneStubs) {
    addStubImport(j, root);
  }
}

/**
 * Check if a node is inside a .mock().impl() block
 */
function isInsideImplBlock(j: JSCodeshift, path: any): boolean {
  let current = path.parent;

  while (current) {
    const node = current.node || current.value;

    // Check if we're inside an arrow function that's an argument to .impl()
    if (
      node?.type === 'CallExpression' &&
      node?.callee?.type === 'MemberExpression' &&
      node?.callee?.property?.name === 'impl'
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

/**
 * Add stub import to @suites/unit
 * Merges with existing @suites/unit import if present
 */
function addStubImport(j: JSCodeshift, root: Collection): void {
  // Find @suites/unit import
  const suitesImports = root.find(j.ImportDeclaration, {
    source: {
      value: '@suites/unit',
    },
  });

  if (suitesImports.length === 0) {
    // No @suites/unit import exists yet - it will be created by import-transformer
    // We'll add stub to it in the next pass, or create a placeholder
    return;
  }

  suitesImports.forEach((path) => {
    const specifiers = path.node.specifiers || [];

    // Check if stub is already imported
    const hasStub = specifiers.some((spec) => {
      if (spec.type === 'ImportSpecifier') {
        return spec.imported.name === 'stub';
      }
      return false;
    });

    if (!hasStub) {
      // Add stub import to existing specifiers
      const stubSpecifier = j.importSpecifier(j.identifier('stub'));
      specifiers.push(stubSpecifier);
    }
  });
}
