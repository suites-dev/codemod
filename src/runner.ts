import type { CliOptions, MigrationSummary } from './types';
import type { Logger } from './utils/logger';
import { createFileProcessor } from './utils/file-processor';

/**
 * Run the transformation on the target path
 */
export async function runTransform(
  targetPath: string,
  options: CliOptions,
  logger: Logger
): Promise<MigrationSummary> {
  // Step 1: Discover files
  logger.startSpinner('Discovering files...');

  const fileProcessor = createFileProcessor({
    extensions: options.extensions.split(',').map((ext) => ext.trim()),
    ignorePatterns: options.ignore?.split(',').map((pattern) => pattern.trim()) || [],
  });

  const allFiles = await fileProcessor.discoverFiles(targetPath);
  logger.succeedSpinner(`Found ${allFiles.length} TypeScript files`);

  // Step 2: Filter for Automock files
  logger.startSpinner('Analyzing Automock usage...');
  const automockFiles = fileProcessor.filterAutomockFiles(allFiles);

  if (automockFiles.length === 0) {
    logger.warnSpinner('No Automock files found');
    logger.info('No files contain Automock imports. Migration not needed.');
    return createEmptySummary();
  }

  logger.succeedSpinner(`${automockFiles.length} files contain Automock imports`);
  logger.subsection(`${allFiles.length - automockFiles.length} files skipped (no Automock code)`);

  // TODO: Implement the rest of the transformation pipeline
  // - Pre-analysis phase
  // - Interactive decision phase (if not auto mode)
  // - Transformation phase
  // - Validation phase
  // - Write & report phase

  logger.newline();
  logger.warn('⚠️  Transformation pipeline not yet implemented');
  logger.info('This is a work in progress. Phase 1 (Foundation) is complete.');

  return createEmptySummary();
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
