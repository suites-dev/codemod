/**
 * Tests for compile-await-validator
 *
 * Validates that .compile() calls are awaited (best practice)
 * Severity: Warning
 */

import jscodeshift from 'jscodeshift';
import { validateCompileAwaited } from '../../src/validators/compile-await-validator';
import { ValidationRule } from '../../src/validators/validator-types';

const j = jscodeshift.withParser('tsx');

describe('Compile Await Validator', () => {
  describe('Positive cases - no warnings', () => {
    it('should pass when .compile() is awaited', () => {
      const source = `
        const unitRef = await TestBed.solitary(MyService).compile();
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass when .compile() is awaited in arrow function', () => {
      const source = `
        beforeAll(async () => {
          const unitRef = await TestBed
            .solitary(MyService)
            .compile();
        });
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass when .compile() is awaited with chained mocks', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep1).final({})
          .mock(Dep2).impl(() => ({}))
          .compile();
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass with empty source', () => {
      const source = '';
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass when no .compile() calls exist', () => {
      const source = `
        const service = new MyService();
        expect(service).toBeDefined();
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Negative cases - warnings detected', () => {
    it('should warn when .compile() is not awaited', () => {
      const source = `
        const unitRef = TestBed.solitary(MyService).compile();
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('warning');
      expect(errors[0].rule).toBe(ValidationRule.COMPILE_AWAITED);
      expect(errors[0].message).toContain('should be awaited');
    });

    it('should warn on multiple non-awaited .compile() calls', () => {
      const source = `
        const unitRef1 = TestBed.solitary(Service1).compile();
        const unitRef2 = TestBed.solitary(Service2).compile();
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(2);
      expect(errors[0].severity).toBe('warning');
      expect(errors[1].severity).toBe('warning');
    });

    it('should warn when .compile() in assignment without await', () => {
      const source = `
        let unitRef;
        unitRef = TestBed.solitary(MyService).compile();
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('should be awaited');
    });

    it('should warn when .compile() in destructuring without await', () => {
      const source = `
        const { unit, unitRef } = TestBed.solitary(MyService).compile();
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('warning');
    });
  });

  describe('Edge cases', () => {
    it('should detect only non-awaited .compile() in mixed scenarios', () => {
      const source = `
        const unitRef1 = await TestBed.solitary(Service1).compile();
        const unitRef2 = TestBed.solitary(Service2).compile();
        const unitRef3 = await TestBed.solitary(Service3).compile();
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('warning');
    });

    it('should include line numbers when available', () => {
      const source = `
        const unitRef = TestBed.solitary(MyService).compile();
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors[0].line).toBeDefined();
      expect(errors[0].line).toBeGreaterThan(0);
    });

    it('should warn in different contexts (class methods)', () => {
      const source = `
        class TestSetup {
          setup() {
            const unitRef = TestBed.solitary(MyService).compile();
          }
        }
      `;
      const root = j(source);
      const errors = validateCompileAwaited(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('warning');
    });
  });
});
