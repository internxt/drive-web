// vitest.config.ts
import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    replace({
      preventAssignment: true,
      'process.browser': true,
    }),
  ],
  resolve: {
    alias: {
      crypto: 'crypto-browserify', // Resolve `crypto` to `crypto-browserify`
      stream: 'stream-browserify',
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
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
});
