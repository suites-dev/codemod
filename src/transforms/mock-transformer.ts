import type { JSCodeshift, Collection, ASTPath, CallExpression, Node } from 'jscodeshift';
import type { AnalysisContext } from '../types';
import { isJestFn, isSinonStub } from '../utils/ast-helpers';
import {
  isCallExpression,
  isMemberExpression,
  isIdentifier,
  isObjectExpression,
  extractStringValue,
  extractIdentifierName,
  getMemberPropertyName,
} from '../utils/type-guards';

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
    // For .impl(), wrap argument in arrow function and transform stubs
    transformUsingToImplOrFinal(j, path, needsImpl);
  });
}

/**
 * Find all .using() calls that are part of TestBed mock chains
 * Filters to only match .mock().using() patterns
 */
function findUsingCalls(j: JSCodeshift, root: Collection): Collection<CallExpression> {
  return root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      property: { name: 'using' },
    },
  }).filter((path) => {
    // Verify this .using() is preceded by .mock()
    const mockCall = findMockCall(j, path);
    return mockCall !== null;
  });
}

/**
 * Find the preceding .mock() call in the chain
 */
function findMockCall(j: JSCodeshift, usingPath: ASTPath<CallExpression>): CallExpression | null {
  const callee = usingPath.node.callee;

  if (!isMemberExpression(callee)) {
    return null;
  }

  const object = callee.object;
  if (!isCallExpression(object)) {
    return null;
  }

  const prevCallee = object.callee;
  if (!isMemberExpression(prevCallee)) {
    return null;
  }

  const propertyName = getMemberPropertyName(prevCallee);
  if (propertyName === 'mock') {
    return object;
  }

  return null;
}

/**
 * Extract dependency name from .mock(Dependency) or .mock('TOKEN') call
 * Returns null for edge cases:
 * - No arguments
 * - Template literals: .mock(`TOKEN_${env}`)
 * - Numeric literals: .mock(123)
 * - Complex expressions: .mock(getToken())
 */
function extractDependencyName(mockCall: CallExpression): string | null {
  const args = mockCall.arguments;
  if (!args || args.length === 0) {
    return null;
  }

  const arg = args[0];
  if (!arg) {
    return null;
  }

  // Handle class identifiers: .mock(Dependency)
  const identifierName = extractIdentifierName(arg);
  if (identifierName !== null) {
    return identifierName;
  }

  // Handle string tokens: .mock('API_KEY')
  const stringValue = extractStringValue(arg);
  if (stringValue !== null) {
    // Validate it's a simple string (not empty)
    if (stringValue.length > 0) {
      return stringValue;
    }
  }

  // Reject template literals (TemplateLiteral type)
  if (arg.type === 'TemplateLiteral') {
    return null;
  }

  // Reject numeric literals
  if (arg.type === 'NumericLiteral') {
    return null;
  }

  // Reject complex expressions (CallExpression, BinaryExpression, etc.)
  if (isCallExpression(arg)) {
    return null;
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
  const args = usingPath.node.arguments;
  if (!args || args.length === 0) {
    return false;
  }

  const configArg = args[0];
  if (!configArg) {
    return false;
  }

  // Check if any property value is jest.fn() or sinon.stub()
  if (isObjectExpression(configArg)) {
    const properties = configArg.properties;
    if (!properties) {
      return false;
    }

    const result = properties.some((prop) => {
      // Handle both Property/ObjectProperty and SpreadElement
      // jscodeshift uses different property types depending on the parser
      if (prop.type !== 'Property' && prop.type !== 'ObjectProperty') {
        return false;
      }

      // Property nodes might have different value types
      const value = prop.value;
      if (!value) {
        return false;
      }

      // Check if the value itself is a call expression
      if (isCallExpression(value)) {
        const isStub = isJestFn(value) || isSinonStub(value);
        return isStub;
      }

      return false;
    });

    return result;
  }

  return false;
}

/**
 * Transform .using() to .impl() or .final()
 * For .impl(), wraps the argument in an arrow function: (stubFn) => ({ ... })
 * For .final(), keeps the argument as-is
 */
function transformUsingToImplOrFinal(
  j: JSCodeshift,
  path: ASTPath<CallExpression>,
  needsImpl: boolean
): void {
  const callee = path.node.callee;
  const args = path.node.arguments;

  if (!isMemberExpression(callee)) return;
  if (!args || args.length === 0) return;

  const property = callee.property;
  if (!isIdentifier(property)) return;

  // Change method name
  property.name = needsImpl ? 'impl' : 'final';

  if (needsImpl) {
    // For .impl(), wrap the argument in arrow function: (stubFn) => ({ ... })
    const configArg = args[0];

    // Skip SpreadElements and invalid types
    if (configArg.type === 'SpreadElement') return;

    // Transform jest.fn()/sinon.stub() to stubFn() BEFORE wrapping
    if (isObjectExpression(configArg)) {
      transformStubsToStubFnCalls(j, configArg);
    }

    // Wrap in arrow function: (stubFn) => originalArg
    const arrowFunction = j.arrowFunctionExpression(
      [j.identifier('stubFn')],
      configArg as any
    );

    // Replace the argument
    path.node.arguments = [arrowFunction];
  }
}

/**
 * Transform jest.fn() and sinon.stub() to stubFn() calls
 * This modifies the object in place
 * Recursively processes nested objects and arrays
 */
function transformStubsToStubFnCalls(j: JSCodeshift, configArg: Node): void {
  if (!isObjectExpression(configArg)) return;

  const properties = configArg.properties;
  if (!properties) return;

  properties.forEach((prop) => {
    // Handle Property/ObjectProperty types (not SpreadElement)
    // jscodeshift uses different property types depending on the parser
    if (prop.type !== 'Property' && prop.type !== 'ObjectProperty') return;

    let value = prop.value;
    if (!value) return;

    // Unwrap TypeScript type casts (e.g., "jest.fn() as any")
    // TSAsExpression wraps the actual expression
    let hasTypeCast = false;
    if (value.type === 'TSAsExpression') {
      hasTypeCast = true;
      value = value.expression;
    }

    // Handle both simple calls and chained calls
    if (isCallExpression(value)) {
      // Simple jest.fn() or sinon.stub()
      if (isJestFn(value) || isSinonStub(value)) {
        const replacement = j.callExpression(
          j.identifier('stubFn'),
          value.arguments || []
        );

        // Preserve type cast if it existed
        prop.value = hasTypeCast
          ? j.tsAsExpression(replacement, (prop.value as any).typeAnnotation)
          : replacement;
        return;
      }

      // Chained calls: jest.fn().mockResolvedValue() → stubFn().mockResolvedValue()
      const callee = value.callee;
      if (isMemberExpression(callee)) {
        const object = callee.object;
        if (isCallExpression(object)) {
          if (isJestFn(object) || isSinonStub(object)) {
            callee.object = j.callExpression(
              j.identifier('stubFn'),
              object.arguments || []
            );

            // Update the property value (either with or without type cast)
            if (hasTypeCast) {
              (prop.value as any).expression = value;
            }
          }
        }
      }
    }

    // Recursively process nested objects in ALL call expression arguments
    // This handles cases like:
    //   .mockResolvedValue({ unlock: jest.fn() })
    //   .mockResolvedValue(Promise.resolve({ unlock: jest.fn() }))
    if (isCallExpression(value)) {
      if (value.arguments && value.arguments.length > 0) {
        value.arguments.forEach(arg => {
          if (arg.type !== 'SpreadElement') {
            recursivelyTransformStubs(j, arg);
          }
        });
      }
    }

    // Also recursively process nested objects in property values
    // e.g., { prop: { nested: jest.fn() } }
    if (isObjectExpression(value)) {
      transformStubsToStubFnCalls(j, value);
    }
  });
}

/**
 * Recursively transform jest.fn()/sinon.stub() in nested structures
 * This handles arbitrarily nested objects, arrays, and call expressions
 */
function recursivelyTransformStubs(j: JSCodeshift, node: Node): void {
  if (isObjectExpression(node)) {
    // Process object properties
    const properties = node.properties;
    if (properties) {
      properties.forEach((prop) => {
        if (prop.type === 'Property' || prop.type === 'ObjectProperty') {
          let value = prop.value;
          if (!value) return;

          // Unwrap type casts
          if (value.type === 'TSAsExpression') {
            value = value.expression;
          }

          // Replace jest.fn()/sinon.stub() with stubFn()
          if (isCallExpression(value)) {
            if (isJestFn(value) || isSinonStub(value)) {
              const replacement = j.callExpression(j.identifier('stubFn'), value.arguments || []);
              prop.value = prop.value.type === 'TSAsExpression'
                ? j.tsAsExpression(replacement, (prop.value as any).typeAnnotation)
                : replacement;
              value = replacement; // Continue processing this node's children
            }

            // Process chained calls
            const callee = value.callee;
            if (isMemberExpression(callee) && isCallExpression(callee.object)) {
              if (isJestFn(callee.object) || isSinonStub(callee.object)) {
                callee.object = j.callExpression(j.identifier('stubFn'), callee.object.arguments || []);
              }
            }

            // Recursively process arguments
            if (value.arguments) {
              value.arguments.forEach(arg => {
                if (arg.type !== 'SpreadElement') {
                  recursivelyTransformStubs(j, arg);
                }
              });
            }
          } else {
            // Recursively process the value
            recursivelyTransformStubs(j, value);
          }
        }
      });
    }
  } else if (node.type === 'ArrayExpression') {
    const arrayNode = node as any;
    if (arrayNode.elements) {
      arrayNode.elements.forEach((element: Node) => {
        if (element && element.type !== 'SpreadElement') {
          recursivelyTransformStubs(j, element);
        }
      });
    }
  } else if (isCallExpression(node)) {
    // Process call expression arguments
    if (node.arguments) {
      node.arguments.forEach(arg => {
        if (arg.type !== 'SpreadElement') {
          recursivelyTransformStubs(j, arg);
        }
      });
    }
  }
}

