import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import svgr from 'vite-plugin-svgr';

dotenv.config();

const ASSETS_DIR = 'static';

const nodeCompatPlugin = {
  name: 'node-compat-plugin',
  resolveId(id, importer) {
    if (id === 'util/types') {
      return 'virtual:util-types';
    }
    if (id === 'undici') {
      return 'virtual:undici-stub';
    }
    return null;
  },
  load(id) {
    if (id === 'virtual:util-types') {
      return `
        const noop = () => false;
        export const isArgumentsObject = noop;
        export const isBigInt64Array = noop;
        export const isBigUint64Array = noop;
        export const isDate = (value) => value instanceof Date;
        export const isMap = (value) => value instanceof Map;
        export const isRegExp = (value) => value instanceof RegExp;
        export const isSet = (value) => value instanceof Set;
        export const isArrayBuffer = (value) => value instanceof ArrayBuffer;
        export const isSharedArrayBuffer = noop;
        export const isAsyncFunction = noop;
        export const isGeneratorFunction = noop;
        export const isGeneratorObject = noop;
        export const isPromise = (value) => value instanceof Promise;
        export const isMapIterator = noop;
        export const isSetIterator = noop;
        export const isWeakMap = (value) => value instanceof WeakMap;
        export const isWeakSet = (value) => value instanceof WeakSet;
        export const isArrayBufferView = (value) => ArrayBuffer.isView && ArrayBuffer.isView(value);
        export const isTypedArray = (value) => ArrayBuffer.isView && ArrayBuffer.isView(value) && !(value instanceof DataView);
        export const isUint8Array = (value) => value instanceof Uint8Array;
        export const isUint8ClampedArray = (value) => value instanceof Uint8ClampedArray;
        export const isUint16Array = (value) => value instanceof Uint16Array;
        export const isUint32Array = (value) => value instanceof Uint32Array;
        export const isInt8Array = (value) => value instanceof Int8Array;
        export const isInt16Array = (value) => value instanceof Int16Array;
        export const isInt32Array = (value) => value instanceof Int32Array;
        export const isFloat32Array = (value) => value instanceof Float32Array;
        export const isFloat64Array = (value) => value instanceof Float64Array;
        export const isModuleNamespaceObject = noop;
        export const isNativeError = (value) => value instanceof Error;
      `;
    }
    if (id === 'virtual:undici-stub') {
      return `
        export default {
          fetch: globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('fetch not available'))),
          Agent: class Agent {},
          Pool: class Pool {},
          Client: class Client {},
          request: () => Promise.reject(new Error('undici.request not available in browser')),
          stream: () => Promise.reject(new Error('undici.stream not available in browser')),
          pipeline: () => Promise.reject(new Error('undici.pipeline not available in browser')),
          connect: () => Promise.reject(new Error('undici.connect not available in browser')),
          upgrade: () => Promise.reject(new Error('undici.upgrade not available in browser'))
        };
        export const fetch = globalThis.fetch?.bind(globalThis) || (() => Promise.reject(new Error('fetch not available')));
        export const Agent = class Agent {};
        export const Pool = class Pool {};
        export const Client = class Client {};
        export const request = () => Promise.reject(new Error('undici.request not available in browser'));
        export const stream = () => Promise.reject(new Error('undici.stream not available in browser'));
        export const pipeline = () => Promise.reject(new Error('undici.pipeline not available in browser'));
        export const connect = () => Promise.reject(new Error('undici.connect not available in browser'));
        export const upgrade = () => Promise.reject(new Error('undici.upgrade not available in browser'));
      `;
    }
    return null;
  },
};

export default defineConfig({
  base: process.env.PUBLIC_URL ?? '/',
  plugins: [
    react(),
    svgr(),
    nodeCompatPlugin,
    nodePolyfills({
      include: ['stream', 'util', 'buffer', 'crypto', 'events', 'string_decoder', 'assert'],
      exclude: ['fs', 'http', 'https'],
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
      'stream/promises': 'stream-browserify',
      undici: 'virtual:undici-stub',
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
    exclude: ['@internxt/inxt-js', 'undici'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  worker: {
    plugins: [
      nodeCompatPlugin,
      nodePolyfills({
        include: ['stream', 'util', 'buffer', 'crypto', 'events', 'string_decoder', 'assert'],
        exclude: ['fs', 'http', 'https'],
        globals: {
          process: true,
          Buffer: true,
          global: true,
        },
        protocolImports: true,
      }),
    ],
  },
});
