/**
 * Integration tests for the validator orchestrator
 *
 * Tests the validateTransformedCode() function that coordinates
 * all 6 validators and categorizes errors by severity.
 */

import jscodeshift from 'jscodeshift';
import { validateTransformedCode } from '../../src/validators';

const j = jscodeshift.withParser('tsx');

describe('Validator Orchestrator', () => {
  describe('Severity Categorization', () => {
    it('should return success for valid transformed code', () => {
      const source = `
        import { TestBed } from '@suites/unit';

        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl((stubFn) => ({ method: stubFn() }))
          .compile();
      `;
      const root = j(source);
      const result = validateTransformedCode(j, root, source);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.criticalErrors).toHaveLength(0);
    });

    it('should return success for empty source', () => {
      const source = '';
      const root = j(source);
      const result = validateTransformedCode(j, root, source);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.criticalErrors).toHaveLength(0);
    });

    it('should categorize compile-await violations as warnings', () => {
      const source = `
        import { TestBed } from '@suites/unit';

        const unitRef = TestBed
          .solitary(MyService)
          .compile();
      `;
      const root = j(source);
      const result = validateTransformedCode(j, root, source);

      expect(result.success).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].severity).toBe('warning');
      expect(result.errors).toHaveLength(0);
      expect(result.criticalErrors).toHaveLength(0);
    });

    it('should categorize import violations as errors', () => {
      const source = `
        import { TestBed } from '@automock/jest';

        const unitRef = await TestBed
          .solitary(MyService)
          .compile();
      `;
      const root = j(source);
      const result = validateTransformedCode(j, root, source);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe('error');
      expect(result.warnings).toHaveLength(0);
      expect(result.criticalErrors).toHaveLength(0);
    });

    it('should categorize TestBed violations as errors', () => {
      const source = `
        import { TestBed } from '@suites/unit';

        const unitRef = await TestBed
          .create(MyService)
          .compile();
      `;
      const root = j(source);
      const result = validateTransformedCode(j, root, source);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe('error');
    });

    it('should categorize using violations as errors', () => {
      const source = `
        import { TestBed } from '@suites/unit';

        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).using({ method: () => 'value' })
          .compile();
      `;
      const root = j(source);
      const result = validateTransformedCode(j, root, source);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe('error');
    });

    it('should categorize stub violations as errors', () => {
      const source = `
        import { TestBed } from '@suites/unit';

        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).impl(() => ({ method: jest.fn() }))
          .compile();
      `;
      const root = j(source);
      const result = validateTransformedCode(j, root, source);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe('error');
      expect(result.errors[0].message).toContain('jest.fn()');
    });

    it('should categorize final-retrieval violations as critical', () => {
      const source = `
        import { TestBed } from '@suites/unit';

        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep).final({})
          .compile();

        const dep = unitRef.get(Dep);
      `;
      const root = j(source);
      const result = validateTransformedCode(j, root, source);

      expect(result.success).toBe(false);
      expect(result.criticalErrors).toHaveLength(1);
      expect(result.criticalErrors[0].severity).toBe('critical');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Aggregation', () => {
    it('should aggregate multiple error types from different validators', () => {
      const source = `
        import { TestBed } from '@automock/jest';

        const unitRef = TestBed
          .create(MyService)
          .mock(Dep).using({ method: jest.fn() })
          .compile();
      `;
      const root = j(source);
      const result = validateTransformedCode(j, root, source);

      expect(result.success).toBe(false);
      // Should have: import error, testbed error, using error, stub error, compile-await warning
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should aggregate multiple violations of the same type', () => {
      const source = `
        import { TestBed } from '@suites/unit';

        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dep1).impl(() => ({ method: jest.fn() }))
          .mock(Dep2).impl(() => ({ method: jest.fn() }))
          .mock(Dep3).impl(() => ({ method: jest.fn() }))
          .compile();
      `;
      const root = j(source);
      const result = validateTransformedCode(j, root, source);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.every(e => e.message.includes('jest.fn()'))).toBe(true);
    });
  });
});
