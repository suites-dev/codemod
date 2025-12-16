/**
 * Test helper for jscodeshift transforms
 *
 * Provides a utility function to test transforms with a mock jscodeshift API
 */

import jscodeshift from 'jscodeshift';
import type { FileInfo, API, Options, Stats } from 'jscodeshift';
import transform from '../../src/transforms/automock/2/to-suites-v3';
import { validateTransformedCode } from '../../src/validators';

export interface TransformTestResult {
  code: string;
  validation: {
    success: boolean;
    errors: any[];
    warnings: any[];
    criticalErrors: any[];
  };
}

/**
 * Helper function to test the transform with a mock API
 */
export function testTransform(
  source: string,
  parser = 'tsx'
): TransformTestResult {
  const j = jscodeshift.withParser(parser);
  const stats: Stats = (() => {}) as Stats;
  const api: API = {
    j,
    jscodeshift: j,
    stats,
    report: () => {},
  };

  const fileInfo: FileInfo = {
    path: 'test.ts',
    source,
  };

  const options: Options = {
    parser,
    allowCriticalErrors: false,
    print: false,
  };

  try {
    const result = transform(fileInfo, api, options);

    if (result === null || result === undefined) {
      // No changes - return original source with success validation
      return {
        code: source,
        validation: {
          success: true,
          errors: [],
          warnings: [],
          criticalErrors: [],
        },
      };
    }

    // Re-parse to validate
    const transformedRoot = j(result);
    const validation = validateTransformedCode(j, transformedRoot, result);

    return {
      code: result,
      validation: {
        success: validation.success,
        errors: validation.errors,
        warnings: validation.warnings,
        criticalErrors: validation.criticalErrors,
      },
    };
  } catch (error) {
    // Transform threw an error - return error validation
    return {
      code: source,
      validation: {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        criticalErrors: [],
      },
    };
  }
}

