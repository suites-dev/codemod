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
import { createFileProcessor, type FileInfo } from './utils/file-processor';

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
    throw new Error(
      `Transform ${transformInfo.name} does not export applyTransform function`
    );
  }
  // Step 1: Discover files
  logger.startSpinner('Discovering files..');

  const fileProcessor = createFileProcessor({
    extensions: ['.ts', '.tsx'],
    ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
  });

  const allFiles = await fileProcessor.discoverFiles(targetPath);
  logger.succeedSpinner(`Found ${allFiles.length} files`);

  // Step 2: Transform files
  logger.section('🔄 Transforming files...');
  const results: TransformResult[] = [];
  let filesTransformed = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  let sourceFilesCount = 0;

  for (const fileInfo of fileProcessor.filterSourceFiles(allFiles)) {
    sourceFilesCount++;
    const result = await transformFile(
      fileInfo,
      applyTransform,
      options,
      logger
    );
    results.push(result);

    if (result.transformed) {
      filesTransformed++;
    }

    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  // Check if any files were found
  if (sourceFilesCount === 0) {
    logger.warnSpinner('No source framework files found');
    logger.info(
      'No files contain source framework imports. Migration not needed.'
    );
    return createEmptySummary();
  }

  logger.succeedSpinner(
    `${sourceFilesCount} files contain source framework imports`
  );
  logger.subsection(
    `${allFiles.length - sourceFilesCount} files skipped (no source imports)`
  );
  logger.newline();

  // Step 3: Report summary
  logger.newline();
  logger.section('📊 Migration Summary');

  if (filesTransformed > 0) {
    logger.success(
      `${filesTransformed} file${
        filesTransformed > 1 ? 's' : ''
      } transformed successfully`
    );
  }

  if (sourceFilesCount - filesTransformed > 0) {
    logger.info(
      `  ${sourceFilesCount - filesTransformed} file${
        sourceFilesCount - filesTransformed > 1 ? 's' : ''
      } skipped (no changes needed)`
    );
  }

  if (totalWarnings > 0) {
    logger.warn(
      `${totalWarnings} warning${totalWarnings > 1 ? 's' : ''} found`
    );
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
    filesProcessed: sourceFilesCount,
    filesTransformed,
    filesSkipped: sourceFilesCount - filesTransformed,
    errors: totalErrors,
    warnings: totalWarnings,
    results,
  };
}

/**
 * Transform a single file
 */
async function transformFile(
  fileInfo: FileInfo,
  applyTransform: (
    source: string,
    options?: { skipValidation?: boolean; parser?: string }
  ) => any,
  options: CliOptions,
  logger: Logger
): Promise<TransformResult> {
  const result: TransformResult = {
    filePath: fileInfo.path,
    transformed: false,
    changes: [],
    warnings: [],
    errors: [],
  };

  try {
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
    const transformOutput = applyTransform(fileInfo.source, {
      parser: options.parser,
    });

    // Check if code actually changed
    if (transformOutput.code === fileInfo.source) {
      logger.debug(
        `  ⊘ ${path.relative(process.cwd(), fileInfo.path)} (no changes)`
      );
      return result;
    }

    result.transformed = true;

    // Collect validation errors and warnings
    transformOutput.validation.errors.forEach((err: ValidationError) => {
      result.errors.push(`${err.rule}: ${err.message}`);
    });

    transformOutput.validation.warnings.forEach((warn: ValidationError) => {
      result.warnings.push(`${warn.rule}: ${warn.message}`);
    });

    transformOutput.validation.criticalErrors.forEach(
      (err: ValidationError) => {
        result.errors.push(`[CRITICAL] ${err.rule}: ${err.message}`);
      }
    );

    // Skip write if there are critical errors (unless explicitly allowed)
    const hasCriticalErrors =
      transformOutput.validation.criticalErrors.length > 0;
    if (hasCriticalErrors && !options.allowCriticalErrors) {
      logger.error(
        `  ✗ ${path.relative(
          process.cwd(),
          fileInfo.path
        )} (skipped due to critical errors)`
      );
      result.changes.push('Skipped (critical validation errors)');
      return result;
    }

    // Handle --print flag (output to stdout instead of writing)
    if (options.print) {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`File: ${fileInfo.path}`);
      logger.info('='.repeat(60));
      console.log(transformOutput.code);
      logger.info('='.repeat(60));
      result.changes.push('Printed to stdout');
    } else if (!options.dry) {
      // Write transformed file
      await fs.writeFile(fileInfo.path, transformOutput.code, 'utf-8');
      result.changes.push('File updated');
      logger.success(`  ${path.relative(process.cwd(), fileInfo.path)}`);
    } else {
      // Dry run - just report what would change
      result.changes.push('Would be updated (dry)');
      logger.info(`  ~ ${path.relative(process.cwd(), fileInfo.path)} (dry)`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push(errorMessage);
    logger.error(
      `  ${path.relative(process.cwd(), fileInfo.path)}: ${errorMessage}`
    );
  }

  return result;
}

/**
 * Pre-process TypeScript import alias declarations
 * Converts: import X = jest.Y; → const X = jest.Y;
 * This syntax is TypeScript-specific and causes babel parser to fail
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    errors: 0,
    warnings: 0,
    results: [],
  };
}
