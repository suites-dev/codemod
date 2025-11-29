import jscodeshift from 'jscodeshift';
import type { AnalysisContext } from './types';
import { detectSuitesContext } from './analyzers/context-detector';
import { detectRetrievals } from './analyzers/retrieval-detector';
import { analyzeAllMockConfigurations } from './analyzers/stub-detector';
import { transformImports } from './transforms/import-transformer';
import { transformTestBed } from './transforms/testbed-transformer';
import { transformMockConfiguration } from './transforms/mock-transformer';
import { cleanupObsoleteTypeCasts } from './transforms/cleanup-transformer';

const j = jscodeshift.withParser('tsx');

/**
 * Main transformation orchestrator
 * Applies all transformations in the correct order
 */
export function applyTransform(source: string): string {
  const root = j(source);

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
  // Do this after mock transformation to properly handle import additions
  transformImports(j, root, context);

  // Phase 5: Cleanup obsolete type casts (Rule D)
  // Do this last to clean up any remaining type casts
  cleanupObsoleteTypeCasts(j, root);

  return root.toSource({
    quote: 'single',
    trailingComma: true,
  });
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
