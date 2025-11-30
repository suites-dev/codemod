import jscodeshift from 'jscodeshift';
import { transformMockConfiguration } from '../../src/transforms/mock-transformer';
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

describe('Mock Transformer', () => {
  describe('Rule C: Transform .using() to .impl() or .final()', () => {
    describe('Transform to .impl() when retrieved', () => {
      it('should transform .using() to .impl() when mock is retrieved', () => {
        const source = `
          const { unit, unitRef } = TestBed.solitary(Service)
            .mock(Repository)
            .using({ find: () => null })
            .compile();
          const repo = unitRef.get(Repository);
        `;
        const root = j(source);
        const context = createContext({
          retrievedDependencies: new Set(['Repository']),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).toContain('.impl(');
        expect(output).not.toContain('.using(');
      });

      it('should transform multiple .using() calls based on retrieval', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(RepoA)
            .using({ find: () => null })
            .mock(RepoB)
            .using({ save: () => null })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          retrievedDependencies: new Set(['RepoA']),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        // RepoA should be .impl() (retrieved)
        // RepoB should be .final() (not retrieved)
        const implCount = (output.match(/\.impl\(/g) || []).length;
        const finalCount = (output.match(/\.final\(/g) || []).length;
        expect(implCount).toBe(1);
        expect(finalCount).toBe(1);
      });
    });

    describe('Transform to .final() when not retrieved', () => {
      it('should transform .using() to .final() when mock is not retrieved', () => {
        const source = `
          const { unit } = TestBed.solitary(Service)
            .mock(Repository)
            .using({ find: () => null })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          retrievedDependencies: new Set(),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).toContain('.final(');
        expect(output).not.toContain('.using(');
      });

      it('should transform to .final() for simple mock values', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Config)
            .using({ apiKey: 'test-key', timeout: 5000 })
            .compile();
        `;
        const root = j(source);
        const context = createContext();

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).toContain('.final(');
        expect(output).not.toContain('.using(');
      });
    });

    describe('Transform to .impl() when using jest.fn()', () => {
      it('should transform .using() to .impl() when using jest.fn()', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Repository)
            .using({ find: jest.fn() })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          mockConfigurations: new Map([['Repository', true]]),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).toContain('.impl(');
        expect(output).not.toContain('.using(');
      });

      it('should detect jest.fn() inline even without context', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Repository)
            .using({ find: jest.fn(), save: jest.fn() })
            .compile();
        `;
        const root = j(source);
        const context = createContext();

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).toContain('.impl(');
      });
    });

    describe('Transform to .impl() when using sinon.stub()', () => {
      it('should transform .using() to .impl() when using sinon.stub()', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Repository)
            .using({ find: sinon.stub() })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          mockConfigurations: new Map([['Repository', true]]),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).toContain('.impl(');
        expect(output).not.toContain('.using(');
      });

      it('should detect sinon.stub() inline even without context', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Service)
            .using({ method: sinon.stub() })
            .compile();
        `;
        const root = j(source);
        const context = createContext();

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).toContain('.impl(');
      });
    });
  });

  describe('Transform stub functions', () => {
    describe('Transform jest.fn() to stubFn()', () => {
      it('should replace jest.fn() with stubFn() in .impl()', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Repository)
            .using({ find: jest.fn(), save: jest.fn() })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          mockConfigurations: new Map([['Repository', true]]),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).toContain('stubFn()');
        expect(output).not.toContain('jest.fn()');
      });

      it('should transform jest.fn() with implementation', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Repository)
            .using({ find: jest.fn(() => ({ id: 1 })) })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          retrievedDependencies: new Set(['Repository']),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).toContain('stubFn(');
        expect(output).not.toContain('jest.fn(');
      });

      it('should transform multiple jest.fn() calls', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Repository)
            .using({
              find: jest.fn(),
              save: jest.fn(),
              delete: jest.fn(),
            })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          mockConfigurations: new Map([['Repository', true]]),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        const jestFnCount = (output.match(/jest\.fn\(\)/g) || []).length;
        const stubFnCount = (output.match(/stubFn\(\)/g) || []).length;
        expect(jestFnCount).toBe(0);
        expect(stubFnCount).toBe(3);
      });

      it('should transform chained jest.fn() calls', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Repository)
            .using({
              find: jest.fn().mockResolvedValue({ id: 1 }),
              save: jest.fn().mockReturnValue(true)
            })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          retrievedDependencies: new Set(['Repository']),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        // Should transform jest.fn() to stubFn() even in chains
        expect(output).toContain('stubFn().mockResolvedValue');
        expect(output).toContain('stubFn().mockReturnValue');
        expect(output).not.toContain('jest.fn()');
      });
    });

    describe('Transform sinon.stub() to stubFn()', () => {
      it('should replace sinon.stub() with stubFn() in .impl()', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Repository)
            .using({ find: sinon.stub(), save: sinon.stub() })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          mockConfigurations: new Map([['Repository', true]]),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).toContain('stubFn()');
        expect(output).not.toContain('sinon.stub()');
      });

      it('should transform multiple sinon.stub() calls', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Repository)
            .using({
              find: sinon.stub(),
              save: sinon.stub(),
            })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          retrievedDependencies: new Set(['Repository']),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        const sinonStubCount = (output.match(/sinon\.stub\(\)/g) || []).length;
        const stubFnCount = (output.match(/stubFn\(\)/g) || []).length;
        expect(sinonStubCount).toBe(0);
        expect(stubFnCount).toBe(2);
      });
    });

    describe('Mixed stub types', () => {
      it('should transform both jest.fn() and sinon.stub() to stubFn()', () => {
        const source = `
          TestBed.solitary(Service)
            .mock(Repository)
            .using({
              find: jest.fn(),
              save: sinon.stub(),
            })
            .compile();
        `;
        const root = j(source);
        const context = createContext({
          retrievedDependencies: new Set(['Repository']),
        });

        transformMockConfiguration(j, root, context);

        const output = root.toSource();
        expect(output).not.toContain('jest.fn()');
        expect(output).not.toContain('sinon.stub()');
        const stubFnCount = (output.match(/stubFn\(\)/g) || []).length;
        expect(stubFnCount).toBe(2);
      });
    });
  });

  describe('Complete transformation examples', () => {
    it('should handle complete example with .impl() (retrieved mock)', () => {
      const source = `
        beforeAll(async () => {
          const { unit, unitRef } = await TestBed.solitary(UserService)
            .mock(UserRepository)
            .using({ find: jest.fn(), save: jest.fn() })
            .compile();

          service = unit;
          userRepo = unitRef.get(UserRepository);
        });
      `;
      const root = j(source);
      const context = createContext({
        retrievedDependencies: new Set(['UserRepository']),
        mockConfigurations: new Map([['UserRepository', true]]),
      });

      transformMockConfiguration(j, root, context);

      const output = root.toSource();
      expect(output).toContain('.impl(');
      expect(output).not.toContain('.using(');
      expect(output).toContain('stubFn()');
      expect(output).not.toContain('jest.fn()');
    });

    it('should handle complete example with .final() (non-retrieved mock)', () => {
      const source = `
        const { unit } = await TestBed.solitary(Service)
          .mock(Config)
          .using({ apiKey: 'test', timeout: 5000 })
          .compile();
      `;
      const root = j(source);
      const context = createContext({
        retrievedDependencies: new Set(),
      });

      transformMockConfiguration(j, root, context);

      const output = root.toSource();
      expect(output).toContain('.final(');
      expect(output).not.toContain('.using(');
    });

    it('should handle multiple mocks with mixed .impl() and .final()', () => {
      const source = `
        const { unit, unitRef } = await TestBed.solitary(UserService)
          .mock(UserRepository)
          .using({ find: jest.fn() })
          .mock(EmailService)
          .using({ send: jest.fn() })
          .mock(Config)
          .using({ apiKey: 'test' })
          .compile();

        const repo = unitRef.get(UserRepository);
        const email = unitRef.get(EmailService);
      `;
      const root = j(source);
      const context = createContext({
        retrievedDependencies: new Set(['UserRepository', 'EmailService']),
        mockConfigurations: new Map([
          ['UserRepository', true],
          ['EmailService', true],
        ]),
      });

      transformMockConfiguration(j, root, context);

      const output = root.toSource();
      const implCount = (output.match(/\.impl\(/g) || []).length;
      const finalCount = (output.match(/\.final\(/g) || []).length;
      expect(implCount).toBe(2); // UserRepository, EmailService
      expect(finalCount).toBe(1); // Config
      expect(output).toContain('stubFn()');
      expect(output).not.toContain('jest.fn()');
    });

    it('should NOT transform non-TestBed .using() calls', () => {
      const source = `
        const result = someBuilder().using({ option: true });
      `;
      const root = j(source);
      const context = createContext();

      transformMockConfiguration(j, root, context);

      const output = root.toSource();
      // Should not transform non-TestBed chains
      expect(output).toContain('someBuilder().using');
    });
  });
});
