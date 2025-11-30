import jscodeshift from 'jscodeshift';
import type { AnalysisContext, TransformOutput } from './types';
import { detectSuitesContext } from './analyzers/context-detector';
import { detectRetrievals} from './analyzers/retrieval-detector';
import { analyzeAllMockConfigurations } from './analyzers/stub-detector';
import { transformImports } from './transforms/import-transformer';
import { transformTestBed } from './transforms/testbed-transformer';
import { transformMockConfiguration } from './transforms/mock-transformer';
import { transformGlobalJest } from './transforms/global-jest-transformer';
import { cleanupObsoleteTypeCasts } from './transforms/cleanup-transformer';
import { validateTransformedCode } from './validators';

/**
 * Main transformation orchestrator
 * Applies all transformations in the correct order and validates the result
 */
export function applyTransform(
  source: string,
  options?: { skipValidation?: boolean; parser?: string }
): TransformOutput {
  // Input validation
  if (typeof source !== 'string') {
    throw new TypeError('Input must be a string');
  }

  if (source.length === 0) {
    return {
      code: source,
      validation: { success: true, errors: [], warnings: [], criticalErrors: [] },
    };
  }

  // Parse with fallback strategy
  const { j, root } = parseSourceWithFallback(source, options?.parser);


  // Phase 1: Analysis
  const context: AnalysisContext = {
    isSuitesContext: detectSuitesContext(source),
    needsMockedImport: false,
    needsUnitReferenceImport: false,
    retrievedDependencies: detectRetrievals(j, root),
    stubUsages: new Map(),
    mockConfigurations: analyzeAllMockConfigurations(j, root),
  };

  // Check if Mocked type is needed
  context.needsMockedImport = checkNeedsMockedImport(source);

  // Check if UnitReference is needed
  context.needsUnitReferenceImport = checkNeedsUnitReferenceImport(source);

  // Phase 2: Transform TestBed API (Rule B)
  // Do this first because it affects the call chains
  transformTestBed(j, root);

  // Phase 3: Transform mock configuration (Rule C)
  // Must happen after TestBed transformation but before cleanup
  transformMockConfiguration(j, root, context);

  // Phase 4: Transform imports (Rule A)
  // Do this early so @suites/unit import exists for other transformers
  transformImports(j, root, context);

  // Phase 5: Transform standalone jest.fn() calls (Rule E)
  // Do this after imports so we can add stub to @suites/unit import
  transformGlobalJest(j, root, context);

  // Phase 6: Cleanup obsolete type casts (Rule D)
  // Do this last to clean up any remaining type casts
  cleanupObsoleteTypeCasts(j, root);

  // Phase 6: Post-transformation validation
  const transformedSource = root.toSource({
    quote: 'single',
    trailingComma: true,
  });

  const validation = options?.skipValidation
    ? { success: true, errors: [], warnings: [], criticalErrors: [] }
    : validateTransformedCode(j, j(transformedSource), transformedSource);

  return {
    code: transformedSource,
    validation,
  };
}

/**
 * Check if source contains jest.Mocked or SinonStubbedInstance type annotations
 */
function checkNeedsMockedImport(source: string): boolean {
  return /jest\.Mocked|SinonStubbedInstance/.test(source);
}

/**
 * Check if source uses UnitReference
 */
function checkNeedsUnitReferenceImport(source: string): boolean {
  return /:\s*UnitReference|<UnitReference>/.test(source);
}

/**
 * Parse source code with automatic fallback strategy
 * Tries parsers in order: specified parser -> ts -> tsx -> babel
 * This handles the 38 parse error cases from PARSE_ERRORS.md
 *
 * Note: We prefer TypeScript parsers (ts/tsx) over babel because:
 * - Babel can parse TypeScript but may not handle all TS patterns correctly
 * - For example, babel misses TestBed.create<Generic>() calls (parses 5 instead of 6)
 * - The ts/tsx parsers are more accurate for TypeScript code
 */
function parseSourceWithFallback(
  source: string,
  preferredParser?: string
): { j: jscodeshift.JSCodeshift; root: ReturnType<jscodeshift.JSCodeshift> } {
  // Define parser priority - prefer TS parsers for better TypeScript support
  const parserPriority = preferredParser
    ? [preferredParser, 'ts', 'tsx', 'babel']
    : ['ts', 'tsx', 'babel'];

  // Remove duplicates while preserving order
  const parsersToTry = [...new Set(parserPriority)];

  let lastError: Error | null = null;

  for (const parser of parsersToTry) {
    try {
      const j = jscodeshift.withParser(parser);
      const root = j(source);

      // Successfully parsed - return immediately
      return { j, root };
    } catch (error) {
      // Store error and continue to next parser
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  // All parsers failed - throw detailed error
  throw new Error(
    `Failed to parse source code with any available parser (tried: ${parsersToTry.join(', ')}). ` +
    `Last error: ${lastError?.message || 'Unknown error'}`
  );
}
