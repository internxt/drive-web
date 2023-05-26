const { when } = require('@craco/craco');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');
const packageJson = require('./package.json');

module.exports = {
  style: {
    postcss: {
      plugins: [require('tailwindcss'), require('autoprefixer')],
    },
  },
  webpack: {
    plugins: [
      ...when(Boolean(process.env.ANALYZE), () => [new BundleAnalyzerPlugin()], []),
      sentryWebpackPlugin({
        org: 'internxt',
        project: 'internxt-web',
        url: 'https://51b6d35a8b0b4a73b918be0e851c6f07@sentry.internxt.com/',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        include: 'build',
        sourcemaps: {
          ignore: ['./node_modules/**'],
        },
        debug: true,
        // Optionally uncomment the line below to override automatic release name detection
        // release: packageJson.name + '@' + packageJson.version,
      }),
    ],
  },
};
