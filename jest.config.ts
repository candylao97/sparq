import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provides the path to the Next.js app so next/jest can load next.config.js and .env files
  dir: './',
})

const config: Config = {
  coverageProvider: 'v8',

  // Use jsdom for React component tests; individual test files can override via @jest-environment docblock
  testEnvironment: 'jest-environment-jsdom',

  // Run our global setup file after the test framework is installed
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

  // Resolve @/ path alias to match tsconfig paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Only pick up files inside our __tests__ directory
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.ts',
    '<rootDir>/src/__tests__/**/*.test.tsx',
  ],

  // Ignore build output and dependencies
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],

  // Let next/jest handle transform (it sets up SWC or babel-jest automatically)
  // We add ts-jest as a fallback transform for plain TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          // Relax for test files
          strict: false,
        },
      },
    ],
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
}

// Wrap with next/jest so that Next.js-specific transforms and env vars work
export default createJestConfig(config)
