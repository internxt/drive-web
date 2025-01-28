/* eslint-disable */
const { config } = require('@internxt/css-config');

module.exports = {
  ...config,
  content: [...config.content, './node_modules/@internxt/ui/**/*.{js,ts,jsx,tsx}'],
};
