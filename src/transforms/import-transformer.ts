import type { JSCodeshift, Collection } from 'jscodeshift';
import type { AnalysisContext } from '../types';

/**
 * Transform imports from Automock to Suites
 *
 * Rule A1: Replace main imports
 * Rule A2: Transform mock types (jest.Mocked, SinonStubbedInstance)
 * Rule A3: Transform UnitReference import
 */
export function transformImports(
  j: JSCodeshift,
  root: Collection,
  context: AnalysisContext
): void {
  // Rule A1: Replace @automock/jest or @automock/sinon with @suites/unit
  replaceAutomockImports(j, root);

  // Rule A3: Merge UnitReference from @automock/core into @suites/unit
  mergeUnitReferenceImport(j, root);

  // Rule A2: Transform type annotations (only in Suites context)
  if (context.isSuitesContext) {
    transformTypeAnnotations(j, root);

    // Remove old-style type alias imports (e.g., import Mocked = jest.Mocked)
    removeTypeAliasImports(j, root);
  }

  // Add Mocked import if needed
  if (context.needsMockedImport) {
    addMockedImport(j, root);
  }

  // Add UnitReference import if needed
  if (context.needsUnitReferenceImport) {
    addUnitReferenceImport(j, root);
  }
}

/**
 * Replace @automock/jest or @automock/sinon with @suites/unit
 */
function replaceAutomockImports(j: JSCodeshift, root: Collection): void {
  root
    .find(j.ImportDeclaration, {
      source: {
        type: 'StringLiteral',
      },
    })
    .forEach((path) => {
      const source = path.node.source.value as string;
      if (source === '@automock/jest' || source === '@automock/sinon') {
        path.node.source.value = '@suites/unit';
      }
    });
}

/**
 * Merge UnitReference import from @automock/core into @suites/unit
 */
function mergeUnitReferenceImport(j: JSCodeshift, root: Collection): void {
  // Find @automock/core import
  const coreImports = root.find(j.ImportDeclaration, {
    source: {
      value: '@automock/core',
    },
  });

  if (coreImports.length === 0) return;

  // Get the UnitReference specifier
  coreImports.forEach((path) => {
    const specifiers = path.node.specifiers || [];
    const unitRefSpecifiers = specifiers.filter((spec) => {
      if (spec.type === 'ImportSpecifier') {
        return spec.imported.name === 'UnitReference';
      }
      return false;
    });

    // Add UnitReference to @suites/unit import if it has it
    if (unitRefSpecifiers.length > 0) {
      addUnitReferenceImport(j, root);
    }

    // Remove @automock/core import
    j(path).remove();
  });
}

/**
 * Transform jest.Mocked<T> → Mocked<T>
 * Transform SinonStubbedInstance<T> → Mocked<T>
 */
function transformTypeAnnotations(j: JSCodeshift, root: Collection): void {
  // Transform jest.Mocked<T> type references
  root
    .find(j.TSTypeReference, {
      typeName: {
        type: 'TSQualifiedName',
        left: { name: 'jest' },
        right: { name: 'Mocked' },
      },
    })
    .forEach((path) => {
      // Replace qualified name with simple identifier
      const typeParams = (path.node as any).typeParameters;
      path.replace(
        j.tsTypeReference(
          j.identifier('Mocked'),
          typeParams
        )
      );
    });

  // Transform SinonStubbedInstance<T> type references
  root
    .find(j.TSTypeReference, {
      typeName: {
        name: 'SinonStubbedInstance',
      },
    })
    .forEach((path) => {
      const typeParams = (path.node as any).typeParameters;
      path.replace(
        j.tsTypeReference(
          j.identifier('Mocked'),
          typeParams
        )
      );
    });
}

/**
 * Add Mocked type import to @suites/unit
 * Creates the import declaration if it doesn't exist
 */
function addMockedImport(j: JSCodeshift, root: Collection): void {
  // Find @suites/unit import
  const suitesImports = root.find(j.ImportDeclaration, {
    source: {
      value: '@suites/unit',
    },
  });

  if (suitesImports.length === 0) {
    // No @suites/unit import exists - create one with Mocked
    const mockedSpecifier = j.importSpecifier(
      j.identifier('Mocked')
    );
    (mockedSpecifier as any).importKind = 'type';

    const importDeclaration = j.importDeclaration(
      [mockedSpecifier],
      j.stringLiteral('@suites/unit')
    );

    // Insert at the top of the file after any existing imports
    const existingImports = root.find(j.ImportDeclaration);
    if (existingImports.length > 0) {
      // Add after the last import
      existingImports.at(-1).insertAfter(importDeclaration);
    } else {
      // No imports at all - add at the beginning of the file
      const firstNode = root.find(j.Program).get('body', 0);
      if (firstNode) {
        j(firstNode).insertBefore(importDeclaration);
      }
    }
    return;
  }

  suitesImports.forEach((path) => {
    const specifiers = path.node.specifiers || [];

    // Check if Mocked is already imported
    const hasMocked = specifiers.some((spec) => {
      if (spec.type === 'ImportSpecifier') {
        return spec.imported.name === 'Mocked';
      }
      return false;
    });

    if (!hasMocked) {
      // Add type Mocked import
      const mockedSpecifier = j.importSpecifier(
        j.identifier('Mocked')
      );
      (mockedSpecifier as any).importKind = 'type';

      specifiers.push(mockedSpecifier);
    }
  });
}

/**
 * Add UnitReference type import to @suites/unit
 * Creates the import declaration if it doesn't exist
 */
function addUnitReferenceImport(j: JSCodeshift, root: Collection): void {
  // Find @suites/unit import
  const suitesImports = root.find(j.ImportDeclaration, {
    source: {
      value: '@suites/unit',
    },
  });

  if (suitesImports.length === 0) {
    // No @suites/unit import exists - create one with UnitReference
    const unitRefSpecifier = j.importSpecifier(
      j.identifier('UnitReference')
    );
    (unitRefSpecifier as any).importKind = 'type';

    const importDeclaration = j.importDeclaration(
      [unitRefSpecifier],
      j.stringLiteral('@suites/unit')
    );

    // Insert at the top of the file after any existing imports
    const existingImports = root.find(j.ImportDeclaration);
    if (existingImports.length > 0) {
      // Add after the last import
      existingImports.at(-1).insertAfter(importDeclaration);
    } else {
      // No imports at all - add at the beginning of the file
      const firstNode = root.find(j.Program).get('body', 0);
      if (firstNode) {
        j(firstNode).insertBefore(importDeclaration);
      }
    }
    return;
  }

  suitesImports.forEach((path) => {
    const specifiers = path.node.specifiers || [];

    // Check if UnitReference is already imported
    const hasUnitRef = specifiers.some((spec) => {
      if (spec.type === 'ImportSpecifier') {
        return spec.imported.name === 'UnitReference';
      }
      return false;
    });

    if (!hasUnitRef) {
      // Add type UnitReference import
      const unitRefSpecifier = j.importSpecifier(
        j.identifier('UnitReference')
      );
      (unitRefSpecifier as any).importKind = 'type';

      specifiers.push(unitRefSpecifier);
    }
  });
}

/**
 * Remove old-style TypeScript type alias imports
 * Examples:
 *   import Mocked = jest.Mocked;
 *   import SinonStubbedInstance = Sinon.SinonStubbedInstance;
 *
 * These need to be removed so we can add the proper imports from @suites/unit
 */
function removeTypeAliasImports(j: JSCodeshift, root: Collection): void {
  // Find all TSImportEqualsDeclaration nodes
  root.find(j.TSImportEqualsDeclaration).forEach((path) => {
    const importAlias = path.node.id.name;
    const moduleReference = path.node.moduleReference;

    // Check if this is aliasing jest.Mocked or SinonStubbedInstance
    if (moduleReference.type === 'TSQualifiedName') {
      const left = (moduleReference as any).left?.name;
      const right = (moduleReference as any).right?.name;

      // Remove: import Mocked = jest.Mocked
      if (
        importAlias === 'Mocked' &&
        left === 'jest' &&
        right === 'Mocked'
      ) {
        j(path).remove();
      }

      // Remove: import SinonStubbedInstance = Sinon.SinonStubbedInstance
      if (
        importAlias === 'SinonStubbedInstance' ||
        right === 'SinonStubbedInstance'
      ) {
        j(path).remove();
      }
    }

    // Also handle direct identifier references (less common but possible)
    if (moduleReference.type === 'Identifier') {
      const name = (moduleReference as any).name;
      if (name === 'SinonStubbedInstance') {
        j(path).remove();
      }
    }
  });
}
