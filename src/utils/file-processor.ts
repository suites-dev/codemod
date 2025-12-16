import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { glob } from 'glob';

export interface FileProcessorOptions {
  extensions: string[];
  ignorePatterns: string[];
  sourceImportPattern?: RegExp;
}

export interface FileInfo {
  path: string;
  source: string;
}

export class FileProcessor {
  private options: FileProcessorOptions;

  constructor(options: Partial<FileProcessorOptions> = {}) {
    this.options = {
      extensions: options.extensions || ['.ts', '.tsx'],
      ignorePatterns: options.ignorePatterns || [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
      ],
    };
  }

  /**
   * Discover files to process based on the target path
   */
  async discoverFiles(targetPath: string): Promise<string[]> {
    const absolutePath = resolve(targetPath);

    // Check if path exists
    if (!existsSync(absolutePath)) {
      throw new Error(`Path does not exist: ${targetPath}`);
    }

    const stats = statSync(absolutePath);

    // If it's a single file, return it
    if (stats.isFile()) {
      return this.isValidFile(absolutePath) ? [absolutePath] : [];
    }

    // If it's a directory, glob for files
    if (stats.isDirectory()) {
      return this.globFiles(absolutePath);
    }

    return [];
  }

  /**
   * Glob for files in a directory
   */
  private async globFiles(directory: string): Promise<string[]> {
    const patterns = this.options.extensions.map((ext) => `**/*${ext}`);

    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: directory,
        absolute: true,
        ignore: this.options.ignorePatterns,
        nodir: true,
      });
      files.push(...matches);
    }

    // Remove duplicates
    return [...new Set(files)];
  }

  /**
   * Check if a file is valid (has a supported extension)
   */
  private isValidFile(filePath: string): boolean {
    return this.options.extensions.some((ext) => filePath.endsWith(ext));
  }

  /**
   * Read a file's contents
   */
  readFile(filePath: string): string {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read file ${filePath}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Write content to a file
   */
  writeFile(filePath: string, content: string): void {
    try {
      writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to write file ${filePath}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Filter files that contain source framework imports
   * Default pattern matches Automock imports for backward compatibility
   * Yields file info objects with path and source content to avoid double reads
   * Uses a generator for memory efficiency with large file sets
   */
  *filterSourceFiles(files: string[]): Generator<FileInfo> {
    for (const filePath of files) {
      const content = this.readFile(filePath);
      if (this.hasSourceImport(content)) {
        yield { path: filePath, source: content };
      }
    }
  }

  /**
   * Check if file content contains source framework imports
   * Default pattern matches Automock imports for backward compatibility
   */
  private hasSourceImport(content: string): boolean {
    const importPattern =
      this.options.sourceImportPattern ||
      /@automock\/(jest|sinon|core)['"]|from\s+['"]@automock\/(jest|sinon|core)['"]/;
    return importPattern.test(content);
  }

  /**
   * Get relative path from current working directory
   */
  getRelativePath(filePath: string): string {
    return filePath.replace(process.cwd() + '/', '');
  }
}

export const createFileProcessor = (
  options?: Partial<FileProcessorOptions>
): FileProcessor => new FileProcessor(options);
