import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const mediaExtensionsType = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'woff', 'woff2', 'ttf', 'otf', 'eot'];

export default defineConfig({
  base: process.env.PUBLIC_URL ?? '/',
  plugins: [
    react(),
    svgr(),
    {
      name: 'vite:remove-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/crossorigin/g, '').replace(/type="module"/g, 'defer="defer"');
      },
    },
    nodePolyfills({
      globals: {
        process: true,
        Buffer: true,
        global: true,
      },
      protocolImports: true,
    }),
  ],
  envPrefix: ['REACT_APP_'],
  build: {
    outDir: 'build',
    assetsDir: 'static',
    rollupOptions: {
      output: {
        entryFileNames: 'static/js/[name].js',
        chunkFileNames: 'static/js/[name].js',
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop();

          if (ext === 'css') {
            return 'static/css/[name]-[hash][extname]';
          } else if (ext && mediaExtensionsType.includes(ext)) {
            return 'static/media/[name]-[hash][extname]';
          }

          return 'static/media/[name]-[hash][extname]';
        },
      },
    },
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
