import { defineWorkspace } from 'vitest/config';
import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import path from 'path';
import svgr from '@svgr/rollup';

const sharedPlugins = [
  react(),
  replace({
    preventAssignment: true,
    'process.browser': true,
  }),
  svgr({
    svgrOptions: { native: true },
    include: '**/*.svg',
  }),
];

const sharedAliases = {
  app: path.resolve(__dirname, './src/app'),
  assets: path.resolve(__dirname, './src/assets'),
  crypto: 'crypto-browserify',
  stream: 'stream-browserify',
  path: 'path-browserify',
};

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
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{js,ts,jsx,tsx}'],
        exclude: ['src/app/drive/components/FileViewer/viewers/FileDocumentViewer/**'],
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
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{js,ts,jsx,tsx}'],
        exclude: ['src/app/drive/components/FileViewer/viewers/FileDocumentViewer/**'],
      },
    },
    extends: './vitest.shared.js',
  },
]);
