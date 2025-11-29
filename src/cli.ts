import { Command } from 'commander';
import { createLogger } from './utils/logger';
import type { CliOptions } from './types';
import { runTransform } from './runner';

const program = new Command();

program
  .name('@suites/codemod')
  .description('Automated migration tool from Automock to Suites')
  .version('0.1.0')
  .argument('[path]', 'Path to transform (file or directory)', '.')
  .option('-a, --auto', 'Disable interactive mode (auto-transform)', false)
  .option('-d, --dry-run', 'Preview changes without writing files', false)
  .option('-p, --parser <parser>', 'Parser to use (tsx, ts, babel)', 'tsx')
  .option('-e, --extensions <exts>', 'File extensions to transform', '.ts,.tsx')
  .option('-i, --ignore <patterns>', 'Ignore file patterns (comma-separated)')
  .option('--skip-validation', 'Skip TypeScript validation after transform', false)
  .option('-v, --verbose', 'Show detailed transformation logs', false)
  .action(async (path: string, options: CliOptions) => {
    const logger = createLogger(options.verbose);

    try {
      // Show header
      logger.section('🔄 Suites Codemod - Automock → Suites Migration');

      if (options.dryRun) {
        logger.info('Running in dry-run mode (no files will be modified)');
      }

      if (options.auto) {
        logger.info('Running in auto mode (no interactive prompts)');
      } else {
        logger.info('Running in interactive mode (will prompt for ambiguous cases)');
      }

      logger.newline();

      // Run the transformation
      await runTransform(path, options, logger);
    } catch (error) {
      logger.newline();
      logger.error('Migration failed:');
      logger.error((error as Error).message);

      if (options.verbose && (error as Error).stack) {
        logger.debug((error as Error).stack!);
      }

      process.exit(1);
    }
  });

// Parse arguments
program.parse();
