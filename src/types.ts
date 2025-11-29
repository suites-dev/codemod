import type { Collection, JSCodeshift } from 'jscodeshift';

/**
 * CLI options
 */
export interface CliOptions {
  auto: boolean;
  dryRun: boolean;
  parser: string;
  extensions: string;
  ignore?: string;
  skipValidation: boolean;
  verbose: boolean;
}

/**
 * File transformation result
 */
export interface TransformResult {
  filePath: string;
  transformed: boolean;
  changes: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Analysis context for a file
 */
export interface AnalysisContext {
  isSuitesContext: boolean;
  needsMockedImport: boolean;
  needsUnitReferenceImport: boolean;
  retrievedDependencies: Set<string>;
  stubUsages: Map<string, boolean>;
  mockConfigurations: Map<string, MockConfiguration>;
}

/**
 * Mock configuration strategy
 */
export type MockStrategy = 'impl' | 'final';

/**
 * Mock configuration details
 */
export interface MockConfiguration {
  dependency: string;
  strategy: MockStrategy;
  recommendedStrategy: MockStrategy;
  hasStubs: boolean;
  isRetrieved: boolean;
  isAmbiguous: boolean;
}

/**
 * Transformer function signature
 */
export type Transformer = (
  j: JSCodeshift,
  root: Collection,
  context: AnalysisContext
) => void;

/**
 * Analyzer function signature
 */
export type Analyzer = (source: string) => Partial<AnalysisContext>;

/**
 * Validation result
 */
export interface ValidationResult {
  success: boolean;
  errors?: string[];
}

/**
 * Migration summary statistics
 */
export interface MigrationSummary {
  filesProcessed: number;
  filesTransformed: number;
  filesSkipped: number;
  importsUpdated: number;
  mocksConfigured: number;
  errors: number;
  warnings: number;
  results: TransformResult[];
}
