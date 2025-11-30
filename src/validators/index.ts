import type { JSCodeshift, Collection } from 'jscodeshift';
import type { ValidationResult, ValidationError } from '../types';
import { validateNoAutomockImports } from './import-validator';
import { validateTestBedTransformed } from './testbed-validator';
import { validateCompileAwaited } from './compile-await-validator';
import { validateUsingTransformed } from './using-validator';
import { validateNoFinalRetrieval } from './final-retrieval-validator';
import { validateStubsReplaced } from './stub-replacement-validator';

/**
 * Run all post-transformation validators
 * Returns aggregated validation result
 */
export function validateTransformedCode(
  j: JSCodeshift,
  root: Collection,
  source: string
): ValidationResult {
  // Run all validators
  const allErrors: ValidationError[] = [
    ...validateNoAutomockImports(j, root, source),
    ...validateTestBedTransformed(j, root, source),
    ...validateCompileAwaited(j, root, source),
    ...validateUsingTransformed(j, root, source),
    ...validateNoFinalRetrieval(j, root, source),
    ...validateStubsReplaced(j, root, source),
  ];

  // Categorize by severity
  const errors = allErrors.filter(e => e.severity === 'error');
  const warnings = allErrors.filter(e => e.severity === 'warning');
  const criticalErrors = allErrors.filter(e => e.severity === 'critical');

  return {
    success: allErrors.length === 0,
    errors,
    warnings,
    criticalErrors,
  };
}

// Re-export individual validators for testing
export {
  validateNoAutomockImports,
  validateTestBedTransformed,
  validateCompileAwaited,
  validateUsingTransformed,
  validateNoFinalRetrieval,
  validateStubsReplaced,
};
