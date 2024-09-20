/*eslint-disable*/
module.exports = {
  preset: 'ts-jest/presets/js-with-ts-esm',
  transformIgnorePatterns: [
      'node_modules/(?!(@dashlane/pqc-kem-kyber512-browser)/)' 
  ],
  testEnvironment: 'node',
};
