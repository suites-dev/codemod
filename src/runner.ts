import * as path from 'path';
import { run } from 'jscodeshift/src/Runner';
import type { CliOptions, MigrationSummary } from './types';
import type { Logger } from './utils/logger';
import type { TransformInfo } from './transforms';

/**
 * Run the transformation on the target path using jscodeshift's run function
 */
export async function runTransform(
  targetPath: string,
  transformInfo: TransformInfo,
  options: CliOptions,
  logger: Logger
): Promise<MigrationSummary> {
  // Get the path to the transform
  // We need to use the compiled version in dist
  // In development, __dirname points to dist/ after compilation
  const transformPath = path.resolve(__dirname, transformInfo.path + '.js');

  // Prepare jscodeshift options
  // Pass our custom options through jscodeshift's options object
  // When print is enabled, also enable dry mode to prevent file writes
  const jscodeshiftOptions = {
    dry: options.dry || options.print,
    verbose: options.verbose ? 2 : 0,
    extensions: 'ts,tsx',
    ignorePattern: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    parser: options.parser || 'ts',
    runInBand: false, // Use parallel processing
    babel: false, // Don't use babel parser
    // Pass our custom options
    allowCriticalErrors: options.allowCriticalErrors,
    print: options.print,
  };

  // Step 1: Discover and transform files using jscodeshift
  const jscodeshiftResults = await run(
    transformPath,
    [targetPath],
    jscodeshiftOptions
  );

  // Transform jscodeshift results to our format
  const summary = transformJscodeshiftResults(jscodeshiftResults);

  // Check if any files were found
  if (summary.filesProcessed === 0) {
    logger.warnSpinner('No source framework files found');
    logger.info(
      'No files contain source framework imports. Migration not needed.'
    );
    return createEmptySummary();
  }

  logger.newline();

  // Step 2: Report summary
  logger.section('📊 Migration Summary');

  if (summary.filesTransformed > 0) {
    logger.success(
      `${summary.filesTransformed} file${
        summary.filesTransformed > 1 ? 's' : ''
      } transformed successfully`
    );
  }

  if (summary.filesSkipped > 0) {
    logger.info(
      `  ${summary.filesSkipped} file${summary.filesSkipped > 1 ? 's' : ''} skipped (no changes needed)`
    );
  }

  if (summary.errors > 0) {
    logger.error(
      `${summary.errors} error${summary.errors > 1 ? 's' : ''} found`
    );
  }

  return summary;
}

/**
 * Transform jscodeshift results into MigrationSummary format
 */
function transformJscodeshiftResults(jscodeshiftResults: {
  ok?: number;
  nochange?: number;
  error?: number;
  skip?: number;
}): MigrationSummary {
  const filesTransformed = jscodeshiftResults.ok || 0;
  const filesSkipped = jscodeshiftResults.nochange || 0;
  const totalErrors = jscodeshiftResults.error || 0;
  const filesProcessed = filesTransformed + filesSkipped + totalErrors;

  return {
    filesProcessed,
    filesTransformed,
    filesSkipped,
    errors: totalErrors,
  };
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
  };
}
