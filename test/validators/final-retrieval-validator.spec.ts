/**
 * Tests for final-retrieval-validator
 *
 * Validates that dependencies configured with .final() are not retrieved
 * using unitRef.get() - this causes runtime failures.
 *
 * Severity: CRITICAL
 */

import jscodeshift from 'jscodeshift';
import { validateNoFinalRetrieval } from '../../src/validators/final-retrieval-validator';
import { ValidationRule } from '../../src/validators/validator-types';

const j = jscodeshift.withParser('tsx');

describe('Final Retrieval Validator', () => {
  describe('Positive cases - no errors', () => {
    it('should pass when .final() mock is not retrieved', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(HttpClient).final({ get: () => 'data' })
          .compile();

        const service = unitRef.unit();
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass when retrieved mock uses .impl()', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(HttpClient).impl(() => ({ get: () => 'data' }))
          .compile();

        const httpClient = unitRef.get(HttpClient);
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass with multiple .impl() retrievals', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep1).impl(() => ({}))
          .mock(Dep2).impl(() => ({}))
          .compile();

        const dep1 = unitRef.get(Dep1);
        const dep2 = unitRef.get(Dep2);
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass when .final() and .impl() correctly used together', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(HttpClient).impl(() => ({ get: () => 'data' }))
          .mock(Logger).final({ log: () => {} })
          .compile();

        const httpClient = unitRef.get(HttpClient);
        // Logger is .final(), so not retrieved - correct!
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass with empty source', () => {
      const source = '';
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass when no TestBed usage', () => {
      const source = `
        const service = new MyService();
        expect(service).toBeDefined();
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Negative cases - CRITICAL errors detected', () => {
    it('should detect CRITICAL error when .final() mock is retrieved', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(HttpClient).final({ get: () => 'data' })
          .compile();

        const httpClient = unitRef.get(HttpClient);
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('critical');
      expect(errors[0].rule).toBe(ValidationRule.NO_FINAL_RETRIEVAL);
      expect(errors[0].message).toContain('CRITICAL');
      expect(errors[0].message).toContain('HttpClient');
      expect(errors[0].message).toContain('Use .impl() instead');
    });

    it('should detect multiple .final() retrievals', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep1).final({})
          .mock(Dep2).final({})
          .compile();

        const dep1 = unitRef.get(Dep1);
        const dep2 = unitRef.get(Dep2);
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(2);
      expect(errors[0].severity).toBe('critical');
      expect(errors[1].severity).toBe('critical');
      expect(errors[0].message).toContain('Dep1');
      expect(errors[1].message).toContain('Dep2');
    });

    it('should detect token string with .final() retrieved', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock('API_KEY').final('test-key')
          .compile();

        const apiKey = unitRef.get('API_KEY');
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('critical');
      expect(errors[0].message).toContain('API_KEY');
    });

    it('should detect retrieval in different scopes (beforeAll/it)', () => {
      const source = `
        let unitRef;

        beforeAll(async () => {
          unitRef = await TestBed
            .solitary(MyService)
            .mock(HttpClient).final({ get: () => 'data' })
            .compile();
        });

        it('test', () => {
          const httpClient = unitRef.get(HttpClient);
        });
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('critical');
    });
  });

  describe('Edge cases', () => {
    it('should handle complex mock chains correctly', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep1).impl(() => ({}))
          .mock(Dep2).final({})
          .mock(Dep3).impl(() => ({}))
          .compile();

        const dep1 = unitRef.get(Dep1); // OK
        const dep2 = unitRef.get(Dep2); // ERROR
        const dep3 = unitRef.get(Dep3); // OK
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('critical');
      expect(errors[0].message).toContain('Dep2');
    });

    it('should point line numbers to unitRef.get() call', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(HttpClient).final({})
          .compile();

        const httpClient = unitRef.get(HttpClient);
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors[0].line).toBeDefined();
      expect(errors[0].line).toBeGreaterThan(0);
    });

    it('should handle multiple TestBed instances', () => {
      const source = `
        const unitRef1 = await TestBed
          .solitary(Service1)
          .mock(Dep1).final({})
          .compile();

        const unitRef2 = await TestBed
          .solitary(Service2)
          .mock(Dep2).final({})
          .compile();

        const dep1 = unitRef1.get(Dep1);
        const dep2 = unitRef2.get(Dep2);
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors).toHaveLength(2);
      expect(errors[0].message).toContain('Dep1');
      expect(errors[1].message).toContain('Dep2');
    });

    it('should include dependency name in error message', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(SpecificDependency).final({})
          .compile();

        const dep = unitRef.get(SpecificDependency);
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors[0].message).toContain('SpecificDependency');
    });

    it('should verify severity is critical', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).final({})
          .compile();

        const dep = unitRef.get(Dep);
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      expect(errors[0].severity).toBe('critical');
      expect(errors[0].severity).not.toBe('error');
      expect(errors[0].severity).not.toBe('warning');
    });

    it('should handle no mock configuration', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .compile();

        const dep = unitRef.get(SomeDep);
      `;
      const root = j(source);
      const errors = validateNoFinalRetrieval(j, root, source);

      // No .final() calls, so no errors
      expect(errors).toHaveLength(0);
    });
  });
});
