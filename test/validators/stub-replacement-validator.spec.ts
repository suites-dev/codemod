/**
 * Tests for stub-replacement-validator
 *
 * Validates that jest.fn() and sinon.stub() are replaced with stubFn()
 * inside .impl() callbacks.
 *
 * Severity: Error
 */

import jscodeshift from 'jscodeshift';
import { validateStubsReplaced } from '../../src/validators/stub-replacement-validator';
import { ValidationRule } from '../../src/validators/validator-types';

const j = jscodeshift.withParser('tsx');

describe('Stub Replacement Validator', () => {
  describe('Positive cases - no errors', () => {
    it('should pass when stubFn() is used instead of jest.fn()', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl((stubFn) => ({
            method: stubFn()
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass when stubFn() is used instead of sinon.stub()', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl((stubFn) => ({
            method: stubFn()
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass with .final() and no stubs', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).final({ method: () => 'value' })
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass with empty source', () => {
      const source = '';
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass when no TestBed usage', () => {
      const source = `
        const service = new MyService();
        expect(service).toBeDefined();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Negative cases - errors detected', () => {
    it('should detect jest.fn() inside .impl()', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl(() => ({
            method: jest.fn()
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].rule).toBe(ValidationRule.STUBS_REPLACED);
      expect(errors[0].message).toContain('jest.fn()');
      expect(errors[0].message).toContain('stubFn()');
    });

    it('should detect sinon.stub() inside .impl()', () => {
      const source = `
        import * as sinon from 'sinon';

        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl(() => ({
            method: sinon.stub()
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].rule).toBe(ValidationRule.STUBS_REPLACED);
      expect(errors[0].message).toContain('sinon.stub()');
      expect(errors[0].message).toContain('stubFn()');
    });

    it('should detect multiple jest.fn() usages', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl(() => ({
            method1: jest.fn(),
            method2: jest.fn(),
            method3: jest.fn()
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(3);
      expect(errors.every(e => e.severity === 'error')).toBe(true);
      expect(errors.every(e => e.message.includes('jest.fn()'))).toBe(true);
    });

    it('should detect mixed jest.fn() and sinon.stub()', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep1).impl(() => ({
            method: jest.fn()
          }))
          .mock(Dep2).impl(() => ({
            method: sinon.stub()
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(2);
      expect(errors[0].message).toContain('jest.fn()');
      expect(errors[1].message).toContain('sinon.stub()');
    });

    it('should detect jest.fn() with arguments', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl(() => ({
            method: jest.fn((arg) => arg * 2)
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('jest.fn()');
    });

    it('should detect sinon.stub().returns() pattern', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl(() => ({
            method: sinon.stub().returns('value')
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('sinon.stub()');
    });
  });

  describe('Edge cases', () => {
    it('should include line numbers when available', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl(() => ({
            method: jest.fn()
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors[0].line).toBeDefined();
      expect(errors[0].line).toBeGreaterThan(0);
    });

    it('should detect stubs in nested function calls', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl(() => ({
            method: () => jest.fn()
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(1);
    });

    it('should detect stubs in arrays', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl(() => ({
            methods: [jest.fn(), jest.fn()]
          }))
          .compile();
      `;
      const root = j(source);
      const errors = validateStubsReplaced(j, root, source);

      expect(errors).toHaveLength(2);
    });
  });
});
