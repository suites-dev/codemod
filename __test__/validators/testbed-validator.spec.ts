import jscodeshift from 'jscodeshift';
import { validateTestBedTransformed } from '../../src/validators/testbed-validator';
import { ValidationRule } from '../../src/validators/validator-types';

const j = jscodeshift.withParser('tsx');

describe('TestBed Validator', () => {
  describe('validateTestBedTransformed', () => {
    it('should pass when all TestBed.solitary() calls are used', () => {
      const source = `
        import { TestBed } from '@suites/unit';

        const unitRef = await TestBed.solitary(MyService).compile();
      `;

      const root = j(source);
      const errors = validateTestBedTransformed(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should detect remaining TestBed.create() call', () => {
      const source = `
        const unitRef = await TestBed.create(MyService).compile();
      `;

      const root = j(source);
      const errors = validateTestBedTransformed(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe(ValidationRule.TESTBED_TRANSFORMED);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].message).toContain('TestBed.create()');
      expect(errors[0].message).toContain('TestBed.solitary()');
    });

    it('should detect multiple TestBed.create() calls', () => {
      const source = `
        const unitRef1 = await TestBed.create(ServiceA).compile();
        const unitRef2 = await TestBed.create(ServiceB).compile();
      `;

      const root = j(source);
      const errors = validateTestBedTransformed(j, root, source);

      expect(errors).toHaveLength(2);
      expect(errors[0].rule).toBe(ValidationRule.TESTBED_TRANSFORMED);
      expect(errors[1].rule).toBe(ValidationRule.TESTBED_TRANSFORMED);
    });

    it('should include line numbers when available', () => {
      const source = `const unitRef = await TestBed.create(MyService).compile();`;

      const root = j(source);
      const errors = validateTestBedTransformed(j, root, source);

      expect(errors[0].line).toBeDefined();
      expect(errors[0].line).toBeGreaterThan(0);
    });

    it('should pass with mixed valid TestBed.solitary() and unrelated create calls', () => {
      const source = `
        const unitRef = await TestBed.solitary(MyService).compile();
        const factory = SomeFactory.create({ options: true });
      `;

      const root = j(source);
      const errors = validateTestBedTransformed(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should handle empty source', () => {
      const source = '';
      const root = j(source);
      const errors = validateTestBedTransformed(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should handle source without TestBed', () => {
      const source = `
        const service = new MyService();
        service.doSomething();
      `;

      const root = j(source);
      const errors = validateTestBedTransformed(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should handle TestBed.create() in complex chains', () => {
      const source = `
        const unitRef = await TestBed
          .create(MyService)
          .mock(Dependency)
          .impl(stubFn => ({ method: stubFn() }))
          .compile();
      `;

      const root = j(source);
      const errors = validateTestBedTransformed(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe(ValidationRule.TESTBED_TRANSFORMED);
    });
  });
});
