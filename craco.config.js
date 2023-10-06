const { when } = require('@craco/craco');

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const webpack = require('webpack');

module.exports = {
  style: {
    postcss: {
      plugins: [require('tailwindcss'), require('autoprefixer')],
    },
  },

  webpack: {
    configure: {
      resolve: {
        fallback: {
          fs: false,
          assert: require.resolve('assert'),
          buffer: require.resolve('buffer'),
          path: require.resolve('path-browserify'),
          crypto: require.resolve('crypto-browserify'),
          http: require.resolve('stream-http'),
          https: require.resolve('https-browserify'),
          os: require.resolve('os-browserify/browser'),
          process: require.resolve('process/browser'),
          stream: require.resolve('stream-browserify'),
          zlib: require.resolve('browserify-zlib'),
          util: require.resolve('util'),
          url: require.resolve('url'),

        },
      },
    },

    plugins: {
      add: [
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: require.resolve('process/browser'),
        }),
      ],
    },
  },
};
