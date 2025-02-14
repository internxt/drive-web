/* eslint-disable */
const { config } = require('@internxt/css-config');

module.exports = {
  ...config,
  content: [...config.content, './node_modules/@internxt/ui/dist/**/*.{js,ts,jsx,tsx}'],
};
