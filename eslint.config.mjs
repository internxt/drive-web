import eslintConfigInternxt from '@internxt/eslint-config-internxt';
import pluginCypress from 'eslint-plugin-cypress/flat';

export default [
    pluginCypress.configs.recommended,
    ...eslintConfigInternxt,
    {
        rules: {
            "no-console": "off",
            "max-len": "off",
            "@typescript-eslint/no-empty-function": "off",
            "cypress/unsafe-to-chain-command": "off",
            "linebreak-style": "off",
            "@typescript-eslint/no-explicit-any": "warn",
        }
    }
];
