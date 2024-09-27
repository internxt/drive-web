import { defineConfig } from 'vitest/config';

export default defineConfig({
  tsetupFiles: ['./tests/setup.js'],
  test: {
    exclude: ['./tests-examples/demo-todo-app.spec.ts', './tests/example.spec.ts', 'test/e2e/*', './node_modules/*'],
    globals: true,
    environment: 'jsdom',
    browser: {
      provider: 'playwright',
      enabled: true,
      name: 'chromium',
      headless: true,
    },
    reporters: ['default'],
  },

  optimizeDeps: { exclude: ['fsevents'] },
});
