import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  CliOptions,
  MigrationSummary,
  TransformResult,
  ValidationError,
} from './types';
import type { Logger } from './utils/logger';
import type { TransformInfo } from './transforms';
import { createFileProcessor } from './utils/file-processor';

/**
 * Run the transformation on the target path
 */
export async function runTransform(
  targetPath: string,
  transformInfo: TransformInfo,
  options: CliOptions,
  logger: Logger
): Promise<MigrationSummary> {
  // Load the transform module dynamically
  const transformModule = await import(transformInfo.path);
  const applyTransform = transformModule.applyTransform;

  if (!applyTransform) {
    throw new Error(`Transform ${transformInfo.name} does not export applyTransform function`);
  }
  // Step 1: Discover files
  logger.startSpinner('Discovering files..');

  const fileProcessor = createFileProcessor({
    extensions: options.extensions.split(',').map((ext) => ext.trim()),
    ignorePatterns: options.ignore?.split(',').map((pattern) => pattern.trim()) || [],
  });

  const allFiles = await fileProcessor.discoverFiles(targetPath);
  logger.succeedSpinner(`Found ${allFiles.length} files`);

  // Step 2: Filter for Automock files
  logger.startSpinner('Analyzing Automock usage..');
  const automockFiles = fileProcessor.filterAutomockFiles(allFiles);

  if (automockFiles.length === 0) {
    logger.warnSpinner('No Automock files found');
    logger.info('No files contain Automock imports. Migration not needed.');
    return createEmptySummary();
  }

  logger.succeedSpinner(`${automockFiles.length} files contain Automock imports`);
  logger.subsection(`${allFiles.length - automockFiles.length} files skipped (no Automock code)`);

  logger.newline();

  // Step 3: Transform files
  logger.section('🔄 Transforming files...');
  const results: TransformResult[] = [];
  let filesTransformed = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const filePath of automockFiles) {
    const result = await transformFile(filePath, applyTransform, options, logger);
    results.push(result);

    if (result.transformed) {
      filesTransformed++;
    }

    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  // Step 4: Report summary
  logger.newline();
  logger.section('📊 Migration Summary');

  if (filesTransformed > 0) {
    logger.success(`${filesTransformed} file${filesTransformed > 1 ? 's' : ''} transformed successfully`);
  }

  if (automockFiles.length - filesTransformed > 0) {
    logger.info(`  ${automockFiles.length - filesTransformed} file${automockFiles.length - filesTransformed > 1 ? 's' : ''} skipped (no changes needed)`);
  }

  if (totalWarnings > 0) {
    logger.warn(`${totalWarnings} warning${totalWarnings > 1 ? 's' : ''} found`);
  }

  if (totalErrors > 0) {
    logger.error(`${totalErrors} error${totalErrors > 1 ? 's' : ''} found`);
  }

  // Show detailed results if verbose
  if (options.verbose) {
    logger.newline();
    logger.subsection('Detailed Results:');
    results.forEach((result) => {
      if (result.transformed) {
        logger.success(`  ${result.filePath}`);
        result.changes.forEach((change) => logger.debug(`    - ${change}`));
      }
      if (result.warnings.length > 0) {
        result.warnings.forEach((warning) => logger.warn(`    ${warning}`));
      }
      if (result.errors.length > 0) {
        result.errors.forEach((error) => logger.error(`    ${error}`));
      }
    });
  }

  return {
    filesProcessed: automockFiles.length,
    filesTransformed,
    filesSkipped: automockFiles.length - filesTransformed,
    importsUpdated: 0, // TODO: Track this from transformers
    mocksConfigured: 0, // TODO: Track this from transformers
    errors: totalErrors,
    warnings: totalWarnings,
    results,
  };
}

/**
 * Transform a single file
 */
async function transformFile(
  filePath: string,
  applyTransform: (source: string, options?: { skipValidation?: boolean; parser?: string }) => any,
  options: CliOptions,
  logger: Logger
): Promise<TransformResult> {
  const result: TransformResult = {
    filePath,
    transformed: false,
    changes: [],
    warnings: [],
    errors: [],
  };

  try {
    // Read source file
    let source = await fs.readFile(filePath, 'utf-8');

    // Note: Preprocessing has been disabled because the parser fallback strategy
    // now uses ts/tsx parsers first, which handle TypeScript syntax correctly.
    // The preprocessing was breaking valid TypeScript generic syntax like:
    //   unitRef.get<ChargeService>(ChargeService)
    // into invalid syntax:
    //   unitRef.get((ChargeService) as ChargeService)
    //
    // If preprocessing is needed for specific edge cases, it should be done
    // more carefully to avoid breaking valid TypeScript patterns.

    // Apply transformation
    const transformOutput = applyTransform(source, {
      skipValidation: options.skipValidation,
      parser: options.parser,
    });

    // Check if code actually changed
    if (transformOutput.code === source) {
      logger.debug(`  ⊘ ${path.relative(process.cwd(), filePath)} (no changes)`);
      return result;
    }

    result.transformed = true;

    // Collect validation errors and warnings
    if (!options.skipValidation) {
      transformOutput.validation.errors.forEach((err: ValidationError) => {
        result.errors.push(`${err.rule}: ${err.message}`);
      });

      transformOutput.validation.warnings.forEach((warn: ValidationError) => {
        result.warnings.push(`${warn.rule}: ${warn.message}`);
      });

      transformOutput.validation.criticalErrors.forEach((err: ValidationError) => {
        result.errors.push(`[CRITICAL] ${err.rule}: ${err.message}`);
      });
    }

    // Handle --print flag (output to stdout instead of writing)
    if (options.print) {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`File: ${filePath}`);
      logger.info('='.repeat(60));
      console.log(transformOutput.code);
      logger.info('='.repeat(60));
      result.changes.push('Printed to stdout');
    } else if (!options.dryRun) {
      // Write transformed file
      await fs.writeFile(filePath, transformOutput.code, 'utf-8');
      result.changes.push('File updated');
      logger.success(`  ✓ ${path.relative(process.cwd(), filePath)}`);
    } else {
      // Dry run - just report what would change
      result.changes.push('Would be updated (dry-run)');
      logger.info(`  ~ ${path.relative(process.cwd(), filePath)} (dry-run)`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push(errorMessage);
    logger.error(`  ✗ ${path.relative(process.cwd(), filePath)}: ${errorMessage}`);
  }

  return result;
}

/**
 * Pre-process TypeScript import alias declarations
 * Converts: import X = jest.Y; → const X = jest.Y;
 * This syntax is TypeScript-specific and causes babel parser to fail
 */
function preprocessImportAliases(source: string): string {
  // Match: import identifier = jest.something;
  // or:   import identifier = Sinon.something;
  return source.replace(
    /^import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(jest|sinon|Sinon)\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*;/gm,
    'const $1 = $2.$3;'
  );
}

/**
 * Pre-process source to convert old-style type casts that confuse the parser
 * Converts: <Type>value → value as Type
 * This prevents parse errors in .tsx files where <> is ambiguous (JSX vs type cast)
 */
function preprocessTypeCasts(source: string): string {
  // Match common patterns:
  // <Type>identifier
  // <Type>{} or <Type>{ ... }
  // <Type>[] or <Type>[...]
  // <Type>(...)

  // Pattern 1: <Type>identifier or <Type>identifier.property
  let result = source.replace(
    /<([A-Z][a-zA-Z0-9_<>[\],\s|&]*)>([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/g,
    '$2 as $1'
  );

  // Pattern 2: <Type>{} or <Type>{ ... }
  result = result.replace(
    /<([A-Z][a-zA-Z0-9_<>[\],\s|&]*)>(\{[^}]*\})/g,
    '($2 as $1)'
  );

  // Pattern 3: <Type>[] or <Type>[...]
  result = result.replace(
    /<([A-Z][a-zA-Z0-9_<>[\],\s|&]*)>(\[[^\]]*\])/g,
    '($2 as $1)'
  );

  // Pattern 4: <Type>(...)
  result = result.replace(
    /<([A-Z][a-zA-Z0-9_<>[\],\s|&]*)>(\([^)]*\))/g,
    '($2 as $1)'
  );

  return result;
}

/**
 * Create an empty migration summary
 */
function createEmptySummary(): MigrationSummary {
  return {
    filesProcessed: 0,
    filesTransformed: 0,
    filesSkipped: 0,
    importsUpdated: 0,
    mocksConfigured: 0,
    errors: 0,
    warnings: 0,
    results: [],
  };
}
