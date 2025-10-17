import eslintConfigInternxt from '@internxt/eslint-config-internxt';

export default [
    {
        ignores: ['dist', 'tmp', 'scripts'],
    },
    ...eslintConfigInternxt,
    {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "max-len": "off"
    }
  }
];