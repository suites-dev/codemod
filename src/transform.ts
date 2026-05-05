import type { AnalysisContext } from './types';
import { detectSuitesContext } from './analyzers/context-detector';
import { detectRetrievals } from './analyzers/retrieval-detector';
import { analyzeAllMockConfigurations } from './analyzers/stub-detector';
import { transformImports } from './transforms/import-transformer';
import { transformTestBed } from './transforms/testbed-transformer';
import { transformMockConfiguration } from './transforms/mock-transformer';
import { transformGlobalJest } from './transforms/global-jest-transformer';
import { cleanupObsoleteTypeCasts } from './transforms/cleanup-transformer';
import { validateTransformedCode } from './validators';

import type { FileInfo, API } from 'jscodeshift';

/**
 * Apply transformations using jscodeshift's standard transform signature
 * This is the main transformation function that follows jscodeshift conventions
 */
export function transform(fileInfo: FileInfo, api: API): string {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  const source = fileInfo.source;

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

  // Phase 7: Post-transformation validation
  const transformedSource = root.toSource();

  const validationResult = validateTransformedCode(
    j,
    j(transformedSource),
    transformedSource
  );

  // Fail if critical errors are found
  if (validationResult.criticalErrors.length > 0) {
    const errorMessages = validationResult.criticalErrors
      .map((error) => {
        const location = error.line
          ? ` (line ${error.line}${error.column ? `, column ${error.column}` : ''})`
          : '';
        return `  - ${error.message}${location}`;
      })
      .join('\n');
    throw new Error(
      `Transformation failed with ${validationResult.criticalErrors.length} critical error(s):\n${errorMessages}`
    );
  }

  return transformedSource;
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
