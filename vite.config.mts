import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgr from 'vite-plugin-svgr';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const ASSETS_DIR = 'static';

export default defineConfig({
  base: process.env.PUBLIC_URL ?? '/',
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
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@dashlane/pqc-kem-kyber512-browser/dist/pqc-kem-kyber512.wasm',
          dest: ASSETS_DIR,
        },
      ],
    }),
    {
      name: 'serve-wasm-on-dev',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('pqc-kem-kyber512.wasm')) {
            const wasmPath = path.resolve(
              __dirname,
              'node_modules/@dashlane/pqc-kem-kyber512-browser/dist/pqc-kem-kyber512.wasm',
            );
            const wasm = fs.readFileSync(wasmPath);
            res.setHeader('Content-Type', 'application/wasm');
            res.end(wasm);
            return;
          }
          next();
        });
      },
    },
  ],
  envPrefix: ['REACT_APP_'],
  build: {
    outDir: 'build',
    assetsDir: ASSETS_DIR,
  },
  preview: {
    port: 3000,
    open: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    preserveSymlinks: process.env.NODE_ENV === 'development',
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
});
