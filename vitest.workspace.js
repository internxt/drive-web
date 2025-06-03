import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    name: 'browser',
    test: {
      name: 'browser',
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.ts',
      include: ['src/**/*.test.{ts,tsx,js,jsx}', 'test/unit/**/*.test.{ts,tsx,js,jsx}'],
      exclude: ['node_modules', 'dist', 'src/**/*.node.test.ts'],
      browser: {
        provider: 'playwright',
        enabled: true,
        name: 'chromium',
        headless: true,
      },
    },
    extends: './vitest.shared.js',
  },
  {
    name: 'node',
    test: {
      name: 'node',
      environment: 'node',
      include: ['src/**/*.node.test.ts'],
    },
    extends: './vitest.shared.js',
  },
]);
