import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export class Logger {
  private spinner: Ora | null = null;
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * Start a spinner with the given message
   */
  startSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.stop();
    }
    this.spinner = ora(message).start();
  }

  /**
   * Update the spinner message
   */
  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  /**
   * Stop the spinner with a success message
   */
  succeedSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  /**
   * Stop the spinner with a failure message
   */
  failSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  /**
   * Stop the spinner with a warning message
   */
  warnSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.warn(message);
      this.spinner = null;
    }
  }

  /**
   * Log a success message
   */
  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Log an error message
   */
  error(message: string): void {
    console.error(chalk.red('✗'), message);
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Log a debug message (only if verbose is enabled)
   */
  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray('[DEBUG]'), message);
    }
  }

  /**
   * Log a section header
   */
  section(title: string): void {
    console.log('\n' + chalk.bold.cyan(title));
  }

  /**
   * Log a subsection with indentation
   */
  subsection(message: string, indent = 3): void {
    console.log(' '.repeat(indent) + message);
  }

  /**
   * Log a file transformation result
   */
  fileTransformed(filePath: string, changes: string[]): void {
    console.log(chalk.green('✓'), chalk.dim(filePath));
    changes.forEach((change) => {
      this.subsection(chalk.dim(`- ${change}`), 5);
    });
  }

  /**
   * Log a summary report
   */
  summary(stats: {
    filesTransformed: number;
    importsUpdated: number;
    mocksConfigured: number;
    errors: number;
    warnings: number;
  }): void {
    this.section('✅ Migration complete!');
    this.subsection(`${stats.filesTransformed} files transformed`);
    this.subsection(`${stats.importsUpdated} imports updated`);
    this.subsection(`${stats.mocksConfigured} mocks configured`);
    if (stats.errors > 0) {
      this.subsection(chalk.red(`${stats.errors} errors`));
    }
    if (stats.warnings > 0) {
      this.subsection(chalk.yellow(`${stats.warnings} warnings`));
    }
  }

  /**
   * Log a blank line
   */
  newline(): void {
    console.log();
  }
}

export const createLogger = (verbose = false): Logger => new Logger(verbose);
