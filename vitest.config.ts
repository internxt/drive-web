import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      app: path.resolve(__dirname, './src/app'),
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      path: 'path-browserify',
    },
  },
  test: {
    isolate: true,
    workspace: './vitest.workspace.ts',
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
