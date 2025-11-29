/**
 * @suites/codemod
 *
 * Automated migration tool from Automock to Suites
 */

export { runTransform } from './runner';
export type {
  CliOptions,
  TransformResult,
  AnalysisContext,
  MockStrategy,
  MockConfiguration,
  MigrationSummary,
} from './types';
