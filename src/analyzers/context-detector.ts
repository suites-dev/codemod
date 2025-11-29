import type { AnalysisContext } from '../types';

/**
 * Detect if a file uses Automock/Suites patterns
 * This determines whether we should transform type annotations
 */
export function detectSuitesContext(source: string): boolean {
  // Check for imports from @automock/*
  const hasAutomockImport = /@automock\/(jest|sinon|core)/.test(source);

  // Check for imports from @suites/unit
  const hasSuitesImport = /@suites\/unit/.test(source);

  // Check for TestBed usage
  const hasTestBed = /TestBed\.(create|solitary)/.test(source);

  return hasAutomockImport || (hasSuitesImport && hasTestBed);
}

/**
 * Check if file needs Mocked type import
 */
export function needsMockedImport(source: string): boolean {
  // Check if file has jest.Mocked or SinonStubbedInstance type annotations
  // that are used with unitRef.get()

  const hasJestMocked = /:\s*jest\.Mocked</.test(source);
  const hasSinonStubbed = /:\s*SinonStubbedInstance</.test(source);
  const hasUnitRefGet = /unitRef\.get\(/.test(source);

  return (hasJestMocked || hasSinonStubbed) && hasUnitRefGet;
}

/**
 * Check if file needs UnitReference import
 */
export function needsUnitReferenceImport(source: string): boolean {
  // Check if file explicitly imports UnitReference from @automock/core
  return /@automock\/core/.test(source) && /UnitReference/.test(source);
}

/**
 * Perform initial analysis on source code
 */
export function analyzeContext(source: string): Partial<AnalysisContext> {
  return {
    isSuitesContext: detectSuitesContext(source),
    needsMockedImport: needsMockedImport(source),
    needsUnitReferenceImport: needsUnitReferenceImport(source),
  };
}
