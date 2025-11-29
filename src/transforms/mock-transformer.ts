import type { JSCodeshift, Collection, ASTPath, CallExpression } from 'jscodeshift';
import type { AnalysisContext } from '../types';
import { isJestFn, isSinonStub } from '../utils/ast-helpers';

/**
 * Transform mock configuration
 *
 * Rule C: Transform .using() → .impl() or .final()
 * - Use .impl() if mock is retrieved or uses stubs
 * - Use .final() otherwise
 * - Replace jest.fn() → stubFn()
 * - Replace sinon.stub() → stubFn()
 */
export function transformMockConfiguration(
  j: JSCodeshift,
  root: Collection,
  context: AnalysisContext
): void {
  // Find all .using() calls in TestBed chains
  findUsingCalls(j, root).forEach((path) => {
    const mockCall = findMockCall(j, path);
    if (!mockCall) return;

    const dependencyName = extractDependencyName(mockCall);
    if (!dependencyName) return;

    // Determine if this mock needs .impl() or .final()
    const needsImpl = determineNeedsImpl(context, dependencyName, path);

    // Transform .using() to .impl() or .final()
    transformUsingMethod(j, path, needsImpl);

    // Transform stubs within the mock configuration if needed
    if (needsImpl) {
      transformStubsInMockConfig(j, path);
    }
  });
}

/**
 * Find all .using() calls that are part of TestBed mock chains
 */
function findUsingCalls(j: JSCodeshift, root: Collection): Collection<CallExpression> {
  return root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      property: { name: 'using' },
    },
  });
}

/**
 * Find the preceding .mock() call in the chain
 */
function findMockCall(j: JSCodeshift, usingPath: ASTPath<CallExpression>): CallExpression | null {
  const callee = usingPath.node.callee as any;
  if (callee.object?.type === 'CallExpression') {
    const prevCall = callee.object as CallExpression;
    const prevCallee = prevCall.callee as any;
    if (prevCallee.property?.name === 'mock') {
      return prevCall;
    }
  }
  return null;
}

/**
 * Extract dependency name from .mock(Dependency) or .mock('TOKEN') call
 */
function extractDependencyName(mockCall: CallExpression): string | null {
  const arg = (mockCall as any).arguments?.[0];
  if (!arg) return null;

  // Handle class identifiers: .mock(Dependency)
  if (arg.type === 'Identifier') {
    return arg.name;
  }

  // Handle string tokens: .mock('API_KEY')
  if (arg.type === 'StringLiteral' || arg.type === 'Literal') {
    return arg.value as string;
  }

  return null;
}

/**
 * Determine if a mock needs .impl() or .final()
 * Returns true if .impl() is needed, false if .final() should be used
 */
function determineNeedsImpl(
  context: AnalysisContext,
  dependencyName: string,
  usingPath: ASTPath<CallExpression>
): boolean {
  // Check if dependency is retrieved
  const isRetrieved = context.retrievedDependencies.has(dependencyName);
  if (isRetrieved) {
    return true;
  }

  // Check if mock uses stubs (from context analysis)
  const usesStubsFromContext = context.mockConfigurations.get(dependencyName);
  if (usesStubsFromContext) {
    return true;
  }

  // Fallback: Check if this specific .using() call contains jest.fn() or sinon.stub()
  const hasStubsInline = checkForStubsInline(usingPath);
  return hasStubsInline;
}

/**
 * Check if a .using() call contains jest.fn() or sinon.stub() inline
 */
function checkForStubsInline(usingPath: ASTPath<CallExpression>): boolean {
  const args = (usingPath.node as any).arguments;
  if (!args || args.length === 0) return false;

  const configArg = args[0];
  if (!configArg) return false;

  // Check if any property value is jest.fn() or sinon.stub()
  if (configArg.type === 'ObjectExpression') {
    return configArg.properties?.some((prop: any) => {
      if (prop.value?.type === 'CallExpression') {
        return isJestFn(prop.value) || isSinonStub(prop.value);
      }
      return false;
    });
  }

  return false;
}

/**
 * Transform .using() to .impl() or .final()
 */
function transformUsingMethod(
  j: JSCodeshift,
  path: ASTPath<CallExpression>,
  needsImpl: boolean
): void {
  const callee = path.node.callee as any;
  if (callee.property) {
    callee.property.name = needsImpl ? 'impl' : 'final';
  }
}

/**
 * Transform jest.fn() → stubFn() and sinon.stub() → stubFn()
 * within mock configuration object, including chained calls
 */
function transformStubsInMockConfig(j: JSCodeshift, path: ASTPath<CallExpression>): void {
  const args = (path.node as any).arguments;
  if (!args || args.length === 0) return;

  const configArg = args[0];
  if (!configArg || configArg.type !== 'ObjectExpression') return;

  // Transform each property value that contains jest.fn() or sinon.stub()
  configArg.properties?.forEach((prop: any) => {
    if (!prop.value) return;

    // Handle both simple calls and chained calls
    transformStubInValue(j, prop);
  });
}

/**
 * Transform stub calls in a property value, handling both simple and chained calls
 * Examples:
 *   jest.fn() → stubFn()
 *   jest.fn().mockResolvedValue(x) → stubFn().mockResolvedValue(x)
 */
function transformStubInValue(j: JSCodeshift, prop: any): void {
  if (prop.value?.type !== 'CallExpression') return;

  const valueCall = prop.value;

  // Check if this is a simple jest.fn() or sinon.stub() call
  if (isJestFn(valueCall)) {
    prop.value = j.callExpression(
      j.identifier('stubFn'),
      valueCall.arguments || []
    );
    return;
  }

  if (isSinonStub(valueCall)) {
    prop.value = j.callExpression(
      j.identifier('stubFn'),
      valueCall.arguments || []
    );
    return;
  }

  // Check if this is a chained call (e.g., jest.fn().mockResolvedValue())
  const callee = valueCall.callee;
  if (callee?.type === 'MemberExpression' && callee.object?.type === 'CallExpression') {
    const baseCall = callee.object;

    if (isJestFn(baseCall)) {
      // Replace jest.fn() with stubFn() in the chain
      callee.object = j.callExpression(
        j.identifier('stubFn'),
        baseCall.arguments || []
      );
      return;
    }

    if (isSinonStub(baseCall)) {
      // Replace sinon.stub() with stubFn() in the chain
      callee.object = j.callExpression(
        j.identifier('stubFn'),
        baseCall.arguments || []
      );
      return;
    }
  }
}
