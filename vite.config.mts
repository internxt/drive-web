import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import obfuscator from 'vite-plugin-bundle-obfuscator';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgr from 'vite-plugin-svgr';

dotenv.config();

const ASSETS_DIR = 'static';

export default defineConfig({
  base: process.env.PUBLIC_URL ?? '/',
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      scope: '/streamsaver/',
      filename: 'stream-saver-sw.ts',
      srcDir: 'src',
      injectManifest: {
        minify: false,
        enableWorkboxModulesLogs: true,
      },
      includeAssets: ['streamsaver/mitm.html'],
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
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
    obfuscator({
      log: false,
      enable: true,
      autoExcludeNodeModules: true,
      threadPool: true,
      options: {
        compact: true,
        stringArray: true,
        stringArrayThreshold: 1,
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 1,
        stringArrayEncoding: ['base64', 'rc4'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 5,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 5,
        transformObjectKeys: true,
        identifierNamesGenerator: 'hexadecimal',
        splitStrings: true,
        splitStringsChunkLength: 5,
        unicodeEscapeSequence: true,
      },
    }),
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
      views: path.resolve(__dirname, 'src/views'),
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
