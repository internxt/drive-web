import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from 'tailwindcss';

export default {
  base: '/',
  plugins: [
    react(),
    svgr(),
    nodePolyfills({
      globals: {
        process: true,
        Buffer: true,
        global: true,
      },
      protocolImports: true,
    }),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  build: {
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  resolve: {
    alias: {
      app: path.resolve(__dirname, 'src/app'),
      assets: path.resolve(__dirname, 'src/assets'),
      hooks: path.resolve(__dirname, 'src/hooks'),
      use_cases: path.resolve(__dirname, 'src/use_cases'),
      assert: 'assert',
      buffer: 'buffer',
      path: 'path-browserify',
      crypto: 'crypto-browserify',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify/browser',
      process: 'process/browser',
      stream: 'stream-browserify',
      zlib: 'browserify-zlib',
      util: 'util',
      url: 'url',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
};
