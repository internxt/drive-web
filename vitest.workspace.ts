import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineWorkspace } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineWorkspace([
  {
    test: {
      isolate: true,
      sequence: {
        concurrent: false,
        shuffle: false,
      },
      testTimeout: 30000,
      name: 'browser',
      environment: 'jsdom',
      globals: true,
      setupFiles: resolve(__dirname, 'src/setupTests.ts'),
      include: ['src/**/*.test.{ts,tsx,js,jsx}', 'test/unit/**/*.test.{ts,tsx,js,jsx}'],
      exclude: ['node_modules', 'dist', 'src/**/*.node.test.ts'],
      browser: {
        provider: 'playwright',
        enabled: true,
        name: 'chromium',
        headless: true,
        fileParallelism: false,
      },
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: false,
          isolate: true,
        },
      },
    },
    extends: './vitest.shared.ts',
  },
  {
    test: {
      name: 'node',
      environment: 'node',
      include: ['src/**/*.node.test.ts'],
    },
    extends: './vitest.shared.ts',
  },
]);
