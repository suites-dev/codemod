import type { JSCodeshift, Collection, Node, ASTPath } from 'jscodeshift';
import { hasStubCalls, isJestFn, isSinonStub } from '../utils/ast-helpers';

/**
 * Detect stub usage in a mock configuration
 * If a mock uses jest.fn() or sinon.stub(), it MUST use .impl()
 */
export function detectStubUsageInMock(
  j: JSCodeshift,
  mockImplementation: Node
): boolean {
  return hasStubCalls(j, mockImplementation);
}

/**
 * Analyze all .mock().using() calls and detect which ones use stubs
 * Returns a Map of dependency name to stub usage boolean
 */
export function analyzeAllMockConfigurations(
  j: JSCodeshift,
  root: Collection
): Map<string, boolean> {
  const mockConfigs = new Map<string, boolean>();

  // Find all .using() calls (which are .mock().using() patterns)
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'using' },
      },
    })
    .forEach((path) => {
      // Get the .mock() call that precedes .using()
      const mockCallPath = findPrecedingMockCall(j, path);

      if (mockCallPath) {
        // Extract dependency name from .mock(Dependency)
        const mockCall = mockCallPath.value as any;
        const depArg = mockCall.arguments?.[0];

        if (depArg) {
          const depName = extractDependencyName(depArg);

          if (depName) {
            // Get the mock implementation from .using(impl)
            const usingArg = (path.value as any).arguments?.[0];

            if (usingArg) {
              const hasStubs = detectStubUsageInMock(j, usingArg);
              mockConfigs.set(depName, hasStubs);
            }
          }
        }
      }
    });

  return mockConfigs;
}

/**
 * Find the preceding .mock() call in the chain
 * Example: TestBed.create(X).mock(Y).using(Z)
 *          ^^^^^^^^^^^^^^^^^^^^^^^^^
 */
function findPrecedingMockCall(
  j: JSCodeshift,
  usingCallPath: ASTPath
): ASTPath | null {
  const usingCall = usingCallPath.value as any;

  if (
    usingCall.callee?.type === 'MemberExpression' &&
    usingCall.callee?.object?.type === 'CallExpression'
  ) {
    const possibleMockCall = usingCall.callee.object;

    // Check if it's a .mock() call
    if (
      possibleMockCall.callee?.type === 'MemberExpression' &&
      possibleMockCall.callee?.property?.name === 'mock'
    ) {
      return j(possibleMockCall).paths()[0];
    }
  }

  return null;
}

/**
 * Extract dependency name from AST node
 */
function extractDependencyName(node: Node): string | null {
  if (node.type === 'Identifier') {
    return (node as any).name;
  }

  if (node.type === 'StringLiteral' || node.type === 'Literal') {
    const value = (node as any).value;
    return typeof value === 'string' ? value : null;
  }

  return null;
}

/**
 * Check if a specific mock configuration uses stubs
 */
export function doesMockUseStubs(
  j: JSCodeshift,
  root: Collection,
  dependencyName: string
): boolean {
  const configs = analyzeAllMockConfigurations(j, root);
  return configs.get(dependencyName) || false;
}

/**
 * Count total number of stubs in source code
 */
export function countStubsInSource(j: JSCodeshift, source: string): number {
  const root = j(source);
  let count = 0;

  root.find(j.CallExpression).forEach((path) => {
    if (isJestFn(path.value) || isSinonStub(path.value)) {
      count++;
    }
  });

  return count;
}
