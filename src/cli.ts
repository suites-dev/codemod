import { Command } from 'commander';
import { createLogger } from './utils/logger';
import type { CliOptions } from './types';
import { runTransform } from './runner';
import { checkGitStatus } from './utils/git-safety';
import {
  getTransform,
  AVAILABLE_TRANSFORMS,
} from './transforms';

const program = new Command();

program
  .name('@suites/codemod')
  .description('Code transformation tool for the Suites testing framework')
  .version('0.1.0')
  .argument(
    '[transform]',
    'Transform to apply (e.g., automock/2/to-suites-v3)'
  )
  .argument('[path]', 'Path to transform (file or directory)', '.')
  .option('-d, --dry-run', 'Preview changes without writing files', false)
  .option('-f, --force', 'Bypass git safety checks', false)
  .option('-p, --parser <parser>', 'Parser to use (tsx, ts, babel)', 'tsx')
  .option('-e, --extensions <exts>', 'File extensions to transform', '.ts,.tsx')
  .option('-i, --ignore <patterns>', 'Ignore file patterns (comma-separated)')
  .option('--print', 'Print transformed output to stdout', false)
  .option('-v, --verbose', 'Show detailed transformation logs', false)
  .option('--skip-validation', 'Skip post-transformation validation checks', false)
  .option('--list-transforms', 'List all available transforms', false)
  .action(
    async (
      transformArg: string | undefined,
      pathArg: string | undefined,
      options: CliOptions & { listTransforms?: boolean }
    ) => {
      const logger = createLogger(options.verbose);

      // Handle --list-transforms
      if (options.listTransforms) {
        console.log('Available transforms:\n');
        AVAILABLE_TRANSFORMS.forEach((t) => {
          console.log(`  ${t.name}`);
          console.log(`    ${t.description}\n`);
        });
        return;
      }

      // Validate transform is provided
      if (!transformArg) {
        logger.error('Transform argument required.');
        logger.info('\nAvailable transforms:');
        AVAILABLE_TRANSFORMS.forEach((t) => {
          console.log(`  ${t.name}`);
          console.log(`    ${t.description}\n`);
        });
        logger.info('Example usage:');
        logger.info(`  npx @suites/codemod ${AVAILABLE_TRANSFORMS[0].name} ./src`);
        process.exit(1);
      }

      const transformName = transformArg;
      const targetPath = pathArg || '.';

      const transformInfo = getTransform(transformName);
      if (!transformInfo) {
        logger.error(`Unknown transform: ${transformName}`);
        logger.error('Run with --list-transforms to see available transforms');
        process.exit(1);
      }

      try {
        // Git safety check (unless in dry-run or force mode)
        if (!options.dryRun && !options.force) {
          checkGitStatus(logger);
        }

        // Show header with dynamic transform name
        logger.section(`🔄 Suites Codemod - ${transformInfo.description}`);

        if (options.dryRun) {
          logger.info('Running in dry-run mode (no files will be modified)');
        }

        if (options.force && !options.dryRun) {
          logger.warn('Bypassing git safety checks (--force enabled)');
        }

        logger.newline();

        // Run the transformation
        await runTransform(targetPath, transformInfo, options, logger);
      } catch (error) {
        logger.newline();
        logger.error('Transformation failed:');
        logger.error((error as Error).message);

        if (options.verbose && (error as Error).stack) {
          logger.debug((error as Error).stack!);
        }

        process.exit(1);
      }
    }
  );

// Parse arguments
program.parse();
