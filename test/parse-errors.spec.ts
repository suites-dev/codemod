/**
 * Parse error handling tests with parser fallback strategy
 *
 * These tests validate that the codemod can handle problematic
 * TypeScript syntax patterns that caused parse errors across 38 files.
 * The parser fallback mechanism tries: babel -> ts -> tsx parsers.
 */

import { loadFixturePair } from './utils/fixture-loader';
import { applyTransform } from '../src/transforms/automock/2/to-suites-v3';

describe('Parse Error Handling', () => {
  describe('Category 1: Multi-Variable Declarations with Generics (18 files)', () => {
    it('should parse and transform files with multi-variable let declarations containing jest.Mocked generics', () => {
      const fixtures = loadFixturePair('parse-multi-var-generics');
      const result = applyTransform(fixtures.input);

      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
      expect(result.code).toContain('@suites/unit');
      expect(result.code).not.toContain('@automock/jest');
    });
  });

  describe('Category 2: TypeScript Type Assertions in Generics (3 files)', () => {
    it('should parse and transform files with type assertions in expect().resolves.toStrictEqual', () => {
      const fixtures = loadFixturePair('parse-type-assertions');
      const result = applyTransform(fixtures.input);

      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
      expect(result.code).toContain('@suites/unit');
      expect(result.code).not.toContain('@automock/jest');
    });
  });

  describe('Category 3: Function Call Syntax Issues (3 files)', () => {
    it('should parse and transform files with spread syntax in function parameters', () => {
      const fixtures = loadFixturePair('parse-spread-params');
      const result = applyTransform(fixtures.input);

      expect(result.code).toMatchSnapshot();
      // Import is still transformed even without TestBed usage
      expect(result.code).toContain('@suites/unit');
    });
  });

  describe('Real-world Integration: Multiple Parse Error Categories', () => {
    it('should parse and transform complex files combining multiple error patterns', () => {
      const fixtures = loadFixturePair('parse-complex-integration');
      const result = applyTransform(fixtures.input);

      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
      expect(result.code).toContain('@suites/unit');
      expect(result.code).not.toContain('@automock/jest');
    });
  });

  describe('Parser Fallback Strategy', () => {
    it('should automatically select the correct parser without manual intervention', () => {
      // Multi-var declarations that babel might struggle with
      const problematicInput = `
import { TestBed } from '@automock/jest';

let service: Service,
    mock: jest.Mocked<Mock>;

describe('Test', () => {
  beforeEach(() => {
    const { unit } = TestBed.create(Service).compile();
    service = unit;
  });
});
`;

      expect(() => {
        const result = applyTransform(problematicInput);
        expect(result.code).toBeDefined();
        expect(result.code).toContain('@suites/unit');
      }).not.toThrow();
    });

    it('should handle tsx syntax with JSX elements', () => {
      const tsxInput = `
import { TestBed } from '@automock/jest';

const Component = () => <div>Test</div>;

describe('ComponentTest', () => {
  it('renders', () => {
    expect(Component()).toBeDefined();
  });
});
`;

      expect(() => {
        const result = applyTransform(tsxInput);
        expect(result.code).toBeDefined();
      }).not.toThrow();
    });
  });
});
