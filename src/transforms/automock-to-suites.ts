/**
 * Automock to Suites Transform
 *
 * Migrates code from Automock testing framework to Suites.
 * This includes:
 * - Import transformations (@automock/* -> @suites/unit)
 * - TestBed API changes (create -> solitary, async compile)
 * - Mock configuration (.using -> .impl/.final)
 * - Type transformations (jest.Mocked -> Mocked)
 * - Cleanup of obsolete patterns
 */

export { applyTransform } from '../transform';
