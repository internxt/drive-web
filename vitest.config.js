import { defineConfig } from 'vitest/config';

export default defineConfig({
  tsetupFiles: ['./tests/setup.js'],
  test: {
    globals: true,
    environment: 'jsdom',
    browser: {
      provider: 'playwright',
      enabled: true,
      name: 'chromium',
    },
    reporters: ['default'],
  },
  define: {
    global: {},
    'process.env': {},
  },
  optimizeDeps: { exclude: ['fsevents'] },
});
