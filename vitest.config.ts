import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'test/**',
        '*.config.ts',
        '*.config.js',
      ],
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    globals: false,
    reporter: 'verbose',
    testTimeout: 10000,
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules/**'],
    watch: false,
    bail: process.env.CI ? 1 : 0
  }
});
