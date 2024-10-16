/*eslint-disable*/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^app/(.*)$': '<rootDir>/src/app/$1',
    '\\.(css|less|scss|svg)$': 'jest-transform-stub',
    '.*WebWorker.util': './WebWorker.mock.ts',
  },
};
