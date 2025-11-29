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
 */
function addMockedImport(j: JSCodeshift, root: Collection): void {
  // Find @suites/unit import
  const suitesImports = root.find(j.ImportDeclaration, {
    source: {
      value: '@suites/unit',
    },
  });

  if (suitesImports.length === 0) return;

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
 */
function addUnitReferenceImport(j: JSCodeshift, root: Collection): void {
  // Find @suites/unit import
  const suitesImports = root.find(j.ImportDeclaration, {
    source: {
      value: '@suites/unit',
    },
  });

  if (suitesImports.length === 0) return;

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
