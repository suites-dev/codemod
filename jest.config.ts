import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  roots: ['<rootDir>'],
  rootDir: '.',
  displayName: 'codemod',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.(spec|test).ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', 'test/**/*.ts'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'fixtures',
    'test/utils',
    'index.ts',
    'types.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  testEnvironment: 'node',
  coverageDirectory: '<rootDir>',
  coverageReporters: [
    'text',
    [
      'cobertura',
      {
        file: process.env.COVERAGE_FILE || 'coverage-report.xml',
      },
    ],
  ],
  reporters: ['default', 'jest-junit'],
  testResultsProcessor: 'jest-junit',
};

export default config;
