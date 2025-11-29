import jscodeshift from 'jscodeshift';
import { transformImports } from '../../src/transforms/import-transformer';
import type { AnalysisContext } from '../../src/types';

const j = jscodeshift.withParser('tsx');

function createContext(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return {
    isSuitesContext: true,
    needsMockedImport: false,
    needsUnitReferenceImport: false,
    retrievedDependencies: new Set(),
    stubUsages: new Map(),
    mockConfigurations: new Map(),
    ...overrides,
  };
}

describe('Import Transformer', () => {
  describe('Rule A1: Replace main imports', () => {
    it('should replace @automock/jest with @suites/unit', () => {
      const source = `import { TestBed } from '@automock/jest';`;
      const root = j(source);
      const context = createContext();

      transformImports(j, root, context);

      const output = root.toSource();
      expect(output).toMatch(/@suites\/unit/);
      expect(output).not.toContain('@automock/jest');
    });

    it('should replace @automock/sinon with @suites/unit', () => {
      const source = `import { TestBed } from '@automock/sinon';`;
      const root = j(source);
      const context = createContext();

      transformImports(j, root, context);

      const output = root.toSource();
      expect(output).toMatch(/@suites\/unit/);
      expect(output).not.toContain('@automock/sinon');
    });

    it('should preserve import specifiers', () => {
      const source = `import { TestBed, UnitTestBed } from '@automock/jest';`;
      const root = j(source);
      const context = createContext();

      transformImports(j, root, context);

      const output = root.toSource();
      expect(output).toContain('TestBed');
      expect(output).toContain('UnitTestBed');
      expect(output).toMatch(/@suites\/unit/);
    });
  });

  describe('Rule A3: Transform UnitReference import', () => {
    it('should remove @automock/core import and add UnitReference to @suites/unit', () => {
      const source = `
        import { TestBed } from '@automock/jest';
        import { UnitReference } from '@automock/core';
      `;
      const root = j(source);
      const context = createContext({ needsUnitReferenceImport: true });

      transformImports(j, root, context);

      const output = root.toSource();
      expect(output).not.toContain('@automock/core');
      expect(output).toContain('UnitReference');
      expect(output).toMatch(/@suites\/unit/);
    });

    it('should handle UnitReference when it needs to be added', () => {
      const source = `import { TestBed } from '@automock/jest';`;
      const root = j(source);
      const context = createContext({ needsUnitReferenceImport: true });

      transformImports(j, root, context);

      const output = root.toSource();
      expect(output).toContain('UnitReference');
      expect(output).toMatch(/@suites\/unit/);
    });
  });

  describe('Rule A2: Transform type annotations', () => {
    it('should transform jest.Mocked<T> to Mocked<T>', () => {
      const source = `
        import { TestBed } from '@automock/jest';
        let repo: jest.Mocked<UserRepository>;
      `;
      const root = j(source);
      const context = createContext({ isSuitesContext: true });

      transformImports(j, root, context);

      const output = root.toSource();
      expect(output).toContain('Mocked<UserRepository>');
      expect(output).not.toContain('jest.Mocked');
    });

    it('should transform SinonStubbedInstance<T> to Mocked<T>', () => {
      const source = `
        import { TestBed } from '@automock/sinon';
        let service: SinonStubbedInstance<Service>;
      `;
      const root = j(source);
      const context = createContext({ isSuitesContext: true });

      transformImports(j, root, context);

      const output = root.toSource();
      expect(output).toContain('Mocked<Service>');
      expect(output).not.toContain('SinonStubbedInstance');
    });

    it('should transform multiple type annotations', () => {
      const source = `
        import { TestBed } from '@automock/jest';
        let repo: jest.Mocked<Repository>;
        let service: jest.Mocked<Service>;
        let logger: jest.Mocked<Logger>;
      `;
      const root = j(source);
      const context = createContext({ isSuitesContext: true });

      transformImports(j, root, context);

      const output = root.toSource();
      expect(output).toContain('Mocked<Repository>');
      expect(output).toContain('Mocked<Service>');
      expect(output).toContain('Mocked<Logger>');
      expect(output).not.toContain('jest.Mocked');
    });

    it('should NOT transform types when not in Suites context', () => {
      const source = `
        let mock: jest.Mocked<Service>;
      `;
      const root = j(source);
      const context = createContext({ isSuitesContext: false });

      transformImports(j, root, context);

      const output = root.toSource();
      expect(output).toContain('jest.Mocked<Service>');
      expect(output).not.toMatch(/let mock: Mocked<Service>/);
    });
  });

  describe('Add Mocked import', () => {
    it('should add Mocked import when needed', () => {
      const source = `import { TestBed } from '@automock/jest';`;
      const root = j(source);
      const context = createContext({ needsMockedImport: true });

      transformImports(j, root, context);

      const output = root.toSource();
      expect(output).toContain('Mocked');
      expect(output).toMatch(/import.*Mocked.*@suites\/unit/);
    });

    it('should not duplicate Mocked import', () => {
      const source = `import { TestBed, type Mocked } from '@automock/jest';`;
      const root = j(source);
      const context = createContext({ needsMockedImport: true });

      transformImports(j, root, context);

      const output = root.toSource();
      // Should only have one Mocked
      const mockedCount = (output.match(/Mocked/g) || []).length;
      expect(mockedCount).toBe(1);
    });
  });

  describe('Complete transformation', () => {
    it('should handle complete example with all transformations', () => {
      const source = `
        import { TestBed } from '@automock/jest';
        import { UnitReference } from '@automock/core';

        describe('Service', () => {
          let service: Service;
          let unitRef: UnitReference;
          let repo: jest.Mocked<Repository>;
          let cache: jest.Mocked<CacheService>;

          beforeAll(() => {
            const { unit, unitRef: ref } = TestBed.create(Service).compile();
            service = unit;
            unitRef = ref;
            repo = unitRef.get(Repository);
            cache = unitRef.get(CacheService);
          });
        });
      `;
      const root = j(source);
      const context = createContext({
        isSuitesContext: true,
        needsMockedImport: true,
        needsUnitReferenceImport: true,
      });

      transformImports(j, root, context);

      const output = root.toSource();

      // Should have @suites/unit import
      expect(output).toMatch(/@suites\/unit/);

      // Should NOT have @automock imports
      expect(output).not.toContain('@automock/jest');
      expect(output).not.toContain('@automock/core');

      // Should have Mocked and UnitReference
      expect(output).toContain('Mocked');
      expect(output).toContain('UnitReference');

      // Should transform jest.Mocked to Mocked
      expect(output).toContain('Mocked<Repository>');
      expect(output).toContain('Mocked<CacheService>');
      expect(output).not.toMatch(/jest\.Mocked/);
    });

    it('should handle Sinon example', () => {
      const source = `
        import { TestBed } from '@automock/sinon';

        let stub: SinonStubbedInstance<Service>;
      `;
      const root = j(source);
      const context = createContext({
        isSuitesContext: true,
        needsMockedImport: true,
      });

      transformImports(j, root, context);

      const output = root.toSource();

      expect(output).toMatch(/@suites\/unit/);
      expect(output).toContain('Mocked<Service>');
      expect(output).not.toContain('SinonStubbedInstance');
      expect(output).not.toContain('@automock/sinon');
    });
  });
});
