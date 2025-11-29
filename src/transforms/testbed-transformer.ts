import type { JSCodeshift, Collection } from 'jscodeshift';
import { makeParentAsync, wrapWithAwait, isAwaitExpression } from '../utils/ast-helpers';

/**
 * Transform TestBed API calls
 *
 * Rule B1: TestBed.create() → TestBed.solitary()
 * Rule B2: Add await to .compile() and make parent function async
 */
export function transformTestBed(j: JSCodeshift, root: Collection): void {
  // Rule B1: Replace .create() with .solitary()
  replaceCreateWithSolitary(j, root);

  // Rule B2: Add await to .compile() calls
  addAwaitToCompile(j, root);
}

/**
 * Replace TestBed.create() with TestBed.solitary()
 */
function replaceCreateWithSolitary(j: JSCodeshift, root: Collection): void {
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 'TestBed' },
        property: { name: 'create' },
      },
    })
    .forEach((path) => {
      // Change 'create' to 'solitary'
      const callee = path.node.callee as any;
      if (callee.property) {
        callee.property.name = 'solitary';
      }
    });
}

/**
 * Add await to .compile() calls and make parent function async
 */
function addAwaitToCompile(j: JSCodeshift, root: Collection): void {
  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'compile' },
      },
    })
    .forEach((path) => {
      // Check if this is a TestBed compile by looking at the call chain
      if (!isTestBedCompile(path.node)) {
        return;
      }

      // Check if already awaited
      if (path.parent && isAwaitExpression(path.parent.value)) {
        return;
      }

      // Add await
      wrapWithAwait(j, path);

      // Make parent function async
      makeParentAsync(j, path);
    });
}

/**
 * Check if a .compile() call is part of a TestBed chain
 * by walking back through the call chain
 */
function isTestBedCompile(node: any): boolean {
  let current = node.callee;

  // Walk back through the call chain
  while (current) {
    if (current.type === 'MemberExpression') {
      // Check if we've reached TestBed
      if (current.object?.name === 'TestBed') {
        return true;
      }

      // If it's a call expression, check its callee
      if (current.object?.type === 'CallExpression') {
        current = current.object.callee;
        continue;
      }

      // Move to the object
      current = current.object;
    } else if (current.type === 'Identifier') {
      // Check if it's TestBed
      return current.name === 'TestBed';
    } else {
      break;
    }
  }

  return false;
}
