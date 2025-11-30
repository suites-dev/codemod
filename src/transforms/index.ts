/**
 * Transform Registry
 *
 * Central registry for all available codemods.
 * Each transform represents a specific migration (e.g., automock-to-suites, v3-to-v4).
 */

export interface TransformInfo {
  /** Unique identifier for the transform (e.g., 'automock-to-suites') */
  name: string;
  /** Human-readable description of what the transform does */
  description: string;
  /** Relative path to the transform module */
  path: string;
}

/**
 * Registry of all available transforms.
 * Add new transforms here as they are created.
 */
export const AVAILABLE_TRANSFORMS: TransformInfo[] = [
  {
    name: 'automock-to-suites',
    description: 'Migrate from Automock to Suites unit testing framework',
    path: './transforms/automock-to-suites',
  },
  // Future transforms will be added here, e.g.:
  // {
  //   name: 'v3-to-v4',
  //   description: 'Migrate from Suites v3 to v4',
  //   path: './transforms/v3-to-v4',
  // },
];

/**
 * Get transform info by name
 * @param name Transform name (e.g., 'automock-to-suites')
 * @returns Transform info or null if not found
 */
export function getTransform(name: string): TransformInfo | null {
  return AVAILABLE_TRANSFORMS.find((t) => t.name === name) || null;
}

/**
 * Get the default transform (first in the registry)
 * Used for backward compatibility when no transform is specified.
 * @returns Default transform info
 */
export function getDefaultTransform(): TransformInfo {
  return AVAILABLE_TRANSFORMS[0];
}

/**
 * Check if a transform name is valid
 * @param name Transform name to check
 * @returns True if the transform exists
 */
export function isValidTransform(name: string): boolean {
  return AVAILABLE_TRANSFORMS.some((t) => t.name === name);
}
