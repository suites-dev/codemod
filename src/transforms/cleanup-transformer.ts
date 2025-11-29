import type { JSCodeshift, Collection } from 'jscodeshift';

/**
 * Clean up obsolete type casts after transformation
 *
 * Rule D: Remove obsolete type casts (as jest.Mocked<T>, as SinonStubbedInstance<T>)
 */
export function cleanupObsoleteTypeCasts(j: JSCodeshift, root: Collection): void {
  // Remove `as jest.Mocked<T>` type casts
  removeJestMockedCasts(j, root);

  // Remove `as SinonStubbedInstance<T>` type casts
  removeSinonStubbedInstanceCasts(j, root);
}

/**
 * Remove `as jest.Mocked<T>` type casts
 * Example: unitRef.get(Repo) as jest.Mocked<Repo> → unitRef.get(Repo)
 */
function removeJestMockedCasts(j: JSCodeshift, root: Collection): void {
  root
    .find(j.TSAsExpression, {
      typeAnnotation: {
        type: 'TSTypeReference',
        typeName: {
          type: 'TSQualifiedName',
          left: { name: 'jest' },
          right: { name: 'Mocked' },
        },
      },
    })
    .forEach((path) => {
      // Replace the TSAsExpression with just its expression
      j(path).replaceWith(path.node.expression);
    });
}

/**
 * Remove `as SinonStubbedInstance<T>` type casts
 * Example: unitRef.get(Service) as SinonStubbedInstance<Service> → unitRef.get(Service)
 */
function removeSinonStubbedInstanceCasts(j: JSCodeshift, root: Collection): void {
  root
    .find(j.TSAsExpression, {
      typeAnnotation: {
        type: 'TSTypeReference',
        typeName: {
          name: 'SinonStubbedInstance',
        },
      },
    })
    .forEach((path) => {
      // Replace the TSAsExpression with just its expression
      j(path).replaceWith(path.node.expression);
    });
}
