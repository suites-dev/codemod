import type { JSCodeshift, Collection, ASTPath, Identifier, Node } from 'jscodeshift';
import { isCallExpression, isMemberExpression, isIdentifier } from './type-guards';

/**
 * Parse source code into AST
 */
export function parseSource(j: JSCodeshift, source: string): Collection {
  return j(source);
}

/**
 * Check if a node is an await expression
 */
export function isAwaitExpression(node: Node): boolean {
  return node?.type === 'AwaitExpression';
}

/**
 * Check if identifier is likely a unitRef variable
 */
export function isUnitRefVariable(node: Node): boolean {
  if (node.type === 'Identifier') {
    const name = (node as Identifier).name;
    return name === 'unitRef' || name.includes('unitRef') || name.includes('ref');
  }
  return false;
}

/**
 * Extract dependency name from a node
 * Handles both identifiers (Class) and string literals ('TOKEN')
 */
export function extractDependencyName(node: Node): string | null {
  if (!node) return null;

  // Handle identifier: unitRef.get(UserRepository)
  if (node.type === 'Identifier') {
    return (node as Identifier).name;
  }

  // Handle string literal: unitRef.get('API_KEY')
  if (node.type === 'StringLiteral' || node.type === 'Literal') {
    const value = (node as any).value;
    return typeof value === 'string' ? value : null;
  }

  return null;
}

/**
 * Find the parent function of a node
 */
export function findParentFunction(
  j: JSCodeshift,
  path: ASTPath
): ASTPath | null {
  let current = path.parent;

  while (current) {
    const node = current.value;
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      return current;
    }
    current = current.parent;
  }

  return null;
}

/**
 * Make a function async if it isn't already
 */
export function makeParentAsync(j: JSCodeshift, path: ASTPath): void {
  const parentFn = findParentFunction(j, path);

  if (parentFn) {
    const node = parentFn.value as any;
    if (!node.async) {
      node.async = true;
    }
  }
}

/**
 * Wrap an expression with await
 */
export function wrapWithAwait(j: JSCodeshift, path: ASTPath): void {
  const awaitExpr = j.awaitExpression(path.value as any);
  j(path).replaceWith(awaitExpr);
}

/**
 * Check if a CallExpression is for jest.fn()
 */
export function isJestFn(node: Node): boolean {
  if (!isCallExpression(node)) return false;

  const callee = node.callee;
  if (!isMemberExpression(callee)) return false;

  const object = callee.object;
  const property = callee.property;

  return (
    isIdentifier(object) &&
    object.name === 'jest' &&
    isIdentifier(property) &&
    property.name === 'fn'
  );
}

/**
 * Check if a CallExpression is for sinon.stub()
 */
export function isSinonStub(node: Node): boolean {
  if (!isCallExpression(node)) return false;

  const callee = node.callee;
  if (!isMemberExpression(callee)) return false;

  const object = callee.object;
  const property = callee.property;

  return (
    isIdentifier(object) &&
    object.name === 'sinon' &&
    isIdentifier(property) &&
    property.name === 'stub'
  );
}

/**
 * Get all call expressions in a node
 */
export function getAllCallExpressions(
  j: JSCodeshift,
  node: Node
): Collection {
  return j(node as any).find(j.CallExpression);
}

/**
 * Check if node contains jest.fn() or sinon.stub() calls
 */
export function hasStubCalls(j: JSCodeshift, node: Node): boolean {
  const calls = getAllCallExpressions(j, node);

  return calls.some((path) => {
    const callNode = path.value;
    return isJestFn(callNode) || isSinonStub(callNode);
  });
}
