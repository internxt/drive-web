import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import path from 'path';
import svgr from 'vite-plugin-svgr';

export default {
  plugins: [
    react(),
    replace({
      preventAssignment: true,
      'process.browser': true,
    }),
    svgr(),
  ],
  resolve: {
    alias: {
      app: path.resolve(__dirname, './src/app'),
      assets: path.resolve(__dirname, './src/assets'),
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
