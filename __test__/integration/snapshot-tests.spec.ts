/**
 * Snapshot tests for complete transformation pipeline
 *
 * These tests use fixtures to validate that transformations
 * produce the expected output across various scenarios.
 */

import { loadFixturePair } from '../utils/fixture-loader';
import { applyTransform } from '../../src/transform';

describe('Snapshot Tests', () => {
  describe('Basic Examples from Specification', () => {
    it('should transform simple mock with .final()', () => {
      const fixtures = loadFixturePair('simple-final');
      const transformed = applyTransform(fixtures.input);
      expect(transformed).toMatchSnapshot();
    });

    it('should transform complex mock with .impl() and retrieval', () => {
      const fixtures = loadFixturePair('complex-impl');
      const transformed = applyTransform(fixtures.input);
      expect(transformed).toMatchSnapshot();
    });

    it('should transform token injection', () => {
      const fixtures = loadFixturePair('token-injection');
      const transformed = applyTransform(fixtures.input);
      expect(transformed).toMatchSnapshot();
    });
  });

  describe('Sinon Framework', () => {
    it('should transform Sinon-based tests', () => {
      const fixtures = loadFixturePair('sinon-example');
      const transformed = applyTransform(fixtures.input);
      expect(transformed).toMatchSnapshot();
    });
  });

  describe('Mixed .impl() and .final()', () => {
    it('should correctly apply .impl() to retrieved mocks and .final() to others', () => {
      const fixtures = loadFixturePair('mixed-impl-final');
      const transformed = applyTransform(fixtures.input);
      expect(transformed).toMatchSnapshot();
    });
  });

  describe('Type Cast Cleanup', () => {
    it('should remove obsolete type casts', () => {
      const fixtures = loadFixturePair('type-cast-cleanup');
      const transformed = applyTransform(fixtures.input);
      expect(transformed).toMatchSnapshot();
    });
  });

  describe('UnitReference Usage', () => {
    it('should handle UnitReference imports and usage', () => {
      const fixtures = loadFixturePair('unit-reference-usage');
      const transformed = applyTransform(fixtures.input);
      expect(transformed).toMatchSnapshot();
    });
  });

  describe('Multiple Test Hooks', () => {
    it('should transform TestBed in beforeAll, beforeEach, and test blocks', () => {
      const fixtures = loadFixturePair('multiple-hooks');
      const transformed = applyTransform(fixtures.input);
      expect(transformed).toMatchSnapshot();
    });
  });

  describe('Edge Cases', () => {
    it('should handle various edge cases correctly', () => {
      const fixtures = loadFixturePair('edge-cases');
      const transformed = applyTransform(fixtures.input);
      expect(transformed).toMatchSnapshot();
    });
  });
});
