// vitest.config.ts
import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';
import svgr from '@svgr/rollup';

export default defineConfig({
  plugins: [
    react(),
    replace({
      preventAssignment: true,
      'process.browser': true,
    }),
    svgr({
      svgrOptions: { native: true },
      include: '**/*.svg',
    }),
  ],
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      app: path.resolve(__dirname, './src/app'),
      assets: path.resolve(__dirname, './src/assets'),
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      path: 'path-browserify',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    exclude: ['node_modules', 'dist'],
    include: ['src/**/*.test.{ts,tsx,js,jsx}', 'test/unit/**/*.test.{ts,tsx,js,jsx}'],
    browser: {
      provider: 'playwright',
      enabled: true,
      name: 'chromium',
      headless: true,
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,ts,jsx,tsx}', 'test/unit/**/*.{js,ts,jsx,tsx}'],
      exclude: ['src/app/drive/components/FileViewer/viewers/FileDocumentViewer/**'],
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
