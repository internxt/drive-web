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
    enabled: true,
    workspace: './vitest.workspace.js',
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
