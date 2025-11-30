import type { Logger } from './logger';

/**
 * Check if git working directory is clean
 * Exits process if directory is dirty (has uncommitted changes)
 */
export function checkGitStatus(logger: Logger): void {
  let clean = false;
  let errorMessage = 'Unable to determine if git directory is clean';

  try {
    // Try to use is-git-clean if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const isGitClean = require('is-git-clean');
    clean = isGitClean.sync(process.cwd());
    errorMessage = 'Git directory is not clean';
  } catch (err: any) {
    // Check if it's a "not a git repository" error
    if (err && err.stderr && err.stderr.indexOf('Not a git repository') >= 0) {
      // Not a git repo - allow the operation
      clean = true;
    } else if (err && err.code === 'MODULE_NOT_FOUND') {
      // is-git-clean not installed - warn and allow
      logger.warn('⚠️  Git safety check skipped (is-git-clean not installed)');
      clean = true;
    }
  }

  if (!clean) {
    logger.error('❌ Git working directory is not clean');
    logger.info('Please commit or stash your changes before running the codemod.');
    logger.info('This ensures you can easily revert changes if needed.');
    logger.newline();
    logger.info('You may use the --force flag to bypass this safety check.');
    process.exit(1);
  }
}
