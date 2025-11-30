import jscodeshift from 'jscodeshift';
import { validateNoAutomockImports } from '../../src/validators/import-validator';
import { ValidationRule } from '../../src/validators/validator-types';

const j = jscodeshift.withParser('tsx');

describe('Import Validator', () => {
  describe('validateNoAutomockImports', () => {
    it('should pass when no @automock imports exist', () => {
      const source = `
        import { TestBed } from '@suites/unit';

        const unitRef = TestBed.solitary(MyClass).compile();
      `;

      const root = j(source);
      const errors = validateNoAutomockImports(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should detect remaining @automock/jest import', () => {
      const source = `
        import { TestBed } from '@automock/jest';
      `;

      const root = j(source);
      const errors = validateNoAutomockImports(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe(ValidationRule.NO_AUTOMOCK_IMPORTS);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].message).toContain('@automock/jest');
      expect(errors[0].message).toContain('@suites/unit');
    });

    it('should detect remaining @automock/sinon import', () => {
      const source = `
        import { TestBed } from '@automock/sinon';
      `;

      const root = j(source);
      const errors = validateNoAutomockImports(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe(ValidationRule.NO_AUTOMOCK_IMPORTS);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].message).toContain('@automock/sinon');
    });

    it('should detect remaining @automock/core import', () => {
      const source = `
        import { UnitReference } from '@automock/core';
      `;

      const root = j(source);
      const errors = validateNoAutomockImports(j, root, source);

      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe(ValidationRule.NO_AUTOMOCK_IMPORTS);
      expect(errors[0].severity).toBe('error');
      expect(errors[0].message).toContain('@automock/core');
    });

    it('should detect multiple @automock imports', () => {
      const source = `
        import { TestBed } from '@automock/jest';
        import { UnitReference } from '@automock/core';
      `;

      const root = j(source);
      const errors = validateNoAutomockImports(j, root, source);

      expect(errors).toHaveLength(2);
      expect(errors[0].message).toContain('@automock/jest');
      expect(errors[1].message).toContain('@automock/core');
    });

    it('should include line numbers when available', () => {
      const source = `import { TestBed } from '@automock/jest';`;

      const root = j(source);
      const errors = validateNoAutomockImports(j, root, source);

      expect(errors[0].line).toBeDefined();
      expect(errors[0].line).toBeGreaterThan(0);
    });

    it('should pass with mixed valid and unrelated imports', () => {
      const source = `
        import { TestBed } from '@suites/unit';
        import { Injectable } from '@nestjs/common';
        import * as fs from 'fs';
      `;

      const root = j(source);
      const errors = validateNoAutomockImports(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should handle empty source', () => {
      const source = '';
      const root = j(source);
      const errors = validateNoAutomockImports(j, root, source);

      expect(errors).toHaveLength(0);
    });

    it('should handle source with no imports', () => {
      const source = `
        const x = 5;
        console.log(x);
      `;

      const root = j(source);
      const errors = validateNoAutomockImports(j, root, source);

      expect(errors).toHaveLength(0);
    });
  });
});
