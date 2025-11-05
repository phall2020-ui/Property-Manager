module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/**/*.(t|j)s',
    '!apps/**/*.module.ts',
    '!apps/**/main.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/$1',
  },
};
