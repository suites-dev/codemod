import type { ASTPath } from 'jscodeshift';
import type { ValidationError, ValidationSeverity } from '../types';

/**
 * Validation rule identifiers
 */
export enum ValidationRule {
  NO_AUTOMOCK_IMPORTS = 'NO_AUTOMOCK_IMPORTS',
  TESTBED_TRANSFORMED = 'TESTBED_TRANSFORMED',
  COMPILE_AWAITED = 'COMPILE_AWAITED',
  USING_TRANSFORMED = 'USING_TRANSFORMED',
  NO_FINAL_RETRIEVAL = 'NO_FINAL_RETRIEVAL',
  STUBS_REPLACED = 'STUBS_REPLACED',
}

/**
 * Helper to create validation error with optional line tracking
 */
export function createValidationError(
  rule: ValidationRule,
  message: string,
  severity: ValidationSeverity,
  path?: ASTPath
): ValidationError {
  const error: ValidationError = {
    rule,
    message,
    severity,
  };

  // Best effort line number tracking
  if (path && path.value) {
    const node = path.value as any;
    if (node.loc) {
      error.line = node.loc.start.line;
      error.column = node.loc.start.column;
    }
  }

  return error;
}
