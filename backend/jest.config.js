module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/**/*.(t|j)s',
    '!apps/**/*.spec.ts',
    '!apps/**/*.e2e-spec.ts',
    '!apps/**/main.ts',
    '!apps/**/*.module.ts',
    '!apps/**/*.interface.ts',
    '!apps/**/*.dto.ts',
    '!apps/**/*.entity.ts',
    '!apps/**/*.type.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'json', 'html', 'lcov', 'junit'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/test/', '<rootDir>/apps/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/$1',
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml',
        suiteName: 'jest tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true',
      },
    ],
  ],
};
