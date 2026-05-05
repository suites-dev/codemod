/**
 * Snapshot tests for complete transformation pipeline
 *
 * These tests use fixtures to validate that transformations
 * produce the expected output across various scenarios.
 */

import { loadFixturePair } from '../utils/fixture-loader';
import { testTransform } from '../utils/transform-test-helper';

describe('Snapshot Tests', () => {
  describe('Basic Examples from Specification', () => {
    it('should transform simple mock with .final()', () => {
      const fixtures = loadFixturePair('simple-final');
      const result = testTransform(fixtures.input);
      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
    });

    it('should transform complex mock with .impl() and retrieval', () => {
      const fixtures = loadFixturePair('complex-impl');
      const result = testTransform(fixtures.input);
      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
    });

    it('should transform token injection', () => {
      const fixtures = loadFixturePair('token-injection');
      const result = testTransform(fixtures.input);
      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
    });
  });

  describe('Sinon Framework', () => {
    it('should transform Sinon-based tests', () => {
      const fixtures = loadFixturePair('sinon-example');
      const result = testTransform(fixtures.input);
      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
    });
  });

  describe('Mixed .impl() and .final()', () => {
    it('should correctly apply .impl() to retrieved mocks and .final() to others', () => {
      const fixtures = loadFixturePair('mixed-impl-final');
      const result = testTransform(fixtures.input);
      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
    });
  });

  describe('Type Cast Cleanup', () => {
    it('should remove obsolete type casts', () => {
      const fixtures = loadFixturePair('type-cast-cleanup');
      const result = testTransform(fixtures.input);
      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
    });
  });

  describe('UnitReference Usage', () => {
    it('should handle UnitReference imports and usage', () => {
      const fixtures = loadFixturePair('unit-reference-usage');
      const result = testTransform(fixtures.input);
      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
    });
  });

  describe('Multiple Test Hooks', () => {
    it('should transform TestBed in beforeAll, beforeEach, and test blocks', () => {
      const fixtures = loadFixturePair('multiple-hooks');
      const result = testTransform(fixtures.input);
      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle various edge cases correctly', () => {
      const fixtures = loadFixturePair('edge-cases');
      const result = testTransform(fixtures.input);
      expect(result.code).toMatchSnapshot();
      expect(result.validation.success).toBe(true);
    });
  });
});
