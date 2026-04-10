import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'path';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      app: path.resolve(__dirname, './src/app'),
      components: path.resolve(__dirname, './src/components'),
      hooks: path.resolve(__dirname, './src/hooks'),
      services: path.resolve(__dirname, './src/services'),
      utils: path.resolve(__dirname, './src/utils'),
      views: path.resolve(__dirname, './src/views'),
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      path: 'path-browserify',
    },
  },
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    isolate: true,
    sequence: {
      concurrent: false,
      shuffle: false,
    },
    mockReset: true,
    restoreMocks: true,
    testTimeout: 30000,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'src/app/drive/components/FileViewer/viewers/FileDocumentViewer/**',
        'src/**/*.test.{js,ts,jsx,tsx}',
        'test/unit/**/*.{js,ts,jsx,tsx}',
      ],
    },
    projects: [
      {
        extends: './vitest.shared.ts',
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
            headless: true,
            fileParallelism: false,
            instances: [{ browser: 'chromium' }],
          },
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: false,
              isolate: true,
            },
          },
        },
      },
      {
        extends: './vitest.shared.ts',
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.node.test.ts'],
        },
      },
    ],
  },
  optimizeDeps: {
    include: ['@internxt/sdk/dist/shared/types/userSettings'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
});
