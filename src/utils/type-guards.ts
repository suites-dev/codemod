import type {
  Node,
  CallExpression,
  MemberExpression,
  Identifier,
  StringLiteral,
  Literal,
  ObjectExpression,
  ArrowFunctionExpression,
  TSQualifiedName,
} from 'jscodeshift';

/**
 * Type guards for AST nodes to eliminate 'any' usage
 */

/**
 * Check if a node is a CallExpression
 */
export function isCallExpression(node: Node | null | undefined): node is CallExpression {
  return node?.type === 'CallExpression';
}

/**
 * Check if a node is a MemberExpression
 */
export function isMemberExpression(node: Node | null | undefined): node is MemberExpression {
  return node?.type === 'MemberExpression';
}

/**
 * Check if a node is an Identifier
 */
export function isIdentifier(node: Node | null | undefined): node is Identifier {
  return node?.type === 'Identifier';
}

/**
 * Check if a node is a StringLiteral
 */
export function isStringLiteral(node: Node | null | undefined): node is StringLiteral {
  return node?.type === 'StringLiteral';
}

/**
 * Check if a node is a Literal
 */
export function isLiteral(node: Node | null | undefined): node is Literal {
  return node?.type === 'Literal';
}

/**
 * Check if a node is an ObjectExpression
 */
export function isObjectExpression(node: Node | null | undefined): node is ObjectExpression {
  return node?.type === 'ObjectExpression';
}

/**
 * Check if a node is an ArrowFunctionExpression
 */
export function isArrowFunctionExpression(node: Node | null | undefined): node is ArrowFunctionExpression {
  return node?.type === 'ArrowFunctionExpression';
}

/**
 * Check if a node is a TSQualifiedName
 */
export function isTSQualifiedName(node: Node | null | undefined): node is TSQualifiedName {
  return node?.type === 'TSQualifiedName';
}

/**
 * Check if a CallExpression is calling a method with a specific name
 */
export function isMethodCall(node: Node | null | undefined, methodName: string): boolean {
  if (!isCallExpression(node)) return false;

  const callee = node.callee;
  if (!isMemberExpression(callee)) return false;

  const property = callee.property;
  if (!isIdentifier(property)) return false;

  return property.name === methodName;
}

/**
 * Check if a CallExpression is jest.fn()
 */
export function isJestFnCall(node: Node | null | undefined): boolean {
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
 * Check if a CallExpression is sinon.stub()
 */
export function isSinonStubCall(node: Node | null | undefined): boolean {
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
 * Extract string value from a node (handles both StringLiteral and Literal)
 */
export function extractStringValue(node: Node | null | undefined): string | null {
  if (!node) return null;

  if (isStringLiteral(node)) {
    return node.value;
  }

  if (isLiteral(node)) {
    const value = node.value;
    return typeof value === 'string' ? value : null;
  }

  return null;
}

/**
 * Extract identifier name from a node
 */
export function extractIdentifierName(node: Node | null | undefined): string | null {
  if (!node) return null;

  if (isIdentifier(node)) {
    return node.name;
  }

  return null;
}

/**
 * Check if a node has a 'name' property (like Identifier or other named nodes)
 */
export function hasNameProperty(node: Node | null | undefined): node is Node & { name: string } {
  return node != null && 'name' in node && typeof (node as any).name === 'string';
}

/**
 * Get the property name from a MemberExpression safely
 */
export function getMemberPropertyName(node: MemberExpression): string | null {
  const property = node.property;
  return extractIdentifierName(property);
}

/**
 * Get the object name from a MemberExpression safely
 */
export function getMemberObjectName(node: MemberExpression): string | null {
  const object = node.object;
  return extractIdentifierName(object);
}