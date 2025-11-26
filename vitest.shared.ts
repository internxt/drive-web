import react from '@vitejs/plugin-react';
import path from 'path';
import svgr from 'vite-plugin-svgr';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default {
  plugins: [react(), nodePolyfills(), svgr()],
  resolve: {
    alias: {
      app: path.resolve(__dirname, './src/app'),
      components: path.resolve(__dirname, './src/components'),
      assets: path.resolve(__dirname, './src/assets'),
      use_cases: path.resolve(__dirname, 'src/use_cases'),
      hooks: path.resolve(__dirname, 'src/hooks'),
      services: path.resolve(__dirname, './src/services'),
      utils: path.resolve(__dirname, './src/utils'),
      views: path.resolve(__dirname, './src/views'),
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      path: 'path-browserify',
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
};
