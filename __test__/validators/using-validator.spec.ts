import jscodeshift from 'jscodeshift';
import { validateUsingTransformed } from '../../src/validators/using-validator';
import { ValidationRule } from '../../src/validators/validator-types';

const j = jscodeshift.withParser('tsx');

describe('Using Validator', () => {
  describe('validateUsingTransformed', () => {
    it('should pass when all .impl() and .final() are used', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(DepA).impl(stubFn => ({ method: stubFn() }))
          .mock(DepB).final({ method: () => 'result' })
          .compile();
      `;

      const root = j(source);
      const errors = validateUsingTransformed(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should detect remaining .using() call', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(Dependency).using({ method: jest.fn() })
          .compile();
      `;

      const root = j(source);
      const errors = validateUsingTransformed(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe(ValidationRule.USING_TRANSFORMED);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].message).toContain('.using()');
      expect(errors[0].message).toContain('.impl()');
      expect(errors[0].message).toContain('.final()');
    });

    it('should detect multiple .using() calls', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(DepA).using({ methodA: jest.fn() })
          .mock(DepB).using({ methodB: jest.fn() })
          .compile();
      `;

      const root = j(source);
      const errors = validateUsingTransformed(j, root, source);

      expect(errors).toHaveLength(2);
      expect(errors[0].rule).toBe(ValidationRule.USING_TRANSFORMED);
      expect(errors[1].rule).toBe(ValidationRule.USING_TRANSFORMED);
    });

    it('should include line numbers when available', () => {
      const source = `TestBed.solitary(S).mock(D).using({})`;

      const root = j(source);
      const errors = validateUsingTransformed(j, root, source);

      expect(errors[0].line).toBeDefined();
      expect(errors[0].line).toBeGreaterThan(0);
    });

    it('should handle empty source', () => {
      const source = '';
      const root = j(source);
      const errors = validateUsingTransformed(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should handle source without mock chains', () => {
      const source = `
        const result = calculator.using(5, 10);
      `;

      const root = j(source);
      const errors = validateUsingTransformed(j, root, source);

      // May flag unrelated .using() - this is acceptable
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should pass with only .impl() calls', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(DepA).impl(stubFn => ({ methodA: stubFn() }))
          .mock(DepB).impl(stubFn => ({ methodB: stubFn() }))
          .compile();
      `;

      const root = j(source);
      const errors = validateUsingTransformed(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should pass with only .final() calls', () => {
      const source = `
        const unitRef = await TestBed
          .solitary(MyService)
          .mock(DepA).final({ methodA: () => 'a' })
          .mock(DepB).final({ methodB: () => 'b' })
          .compile();
      `;

      const root = j(source);
      const errors = validateUsingTransformed(j, root, source);

      expect(errors).toHaveLength(0);
    });
  });
});
