import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import jsdoc from 'eslint-plugin-jsdoc';

const typeCheckedTsOnly = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: ['**/*.ts'],
}));

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'scripts/**'],
  },
  js.configs.recommended,
  ...typeCheckedTsOnly,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      unicorn,
      jsdoc,
    },
    rules: {
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-module': 'off',
      'unicorn/no-null': 'off',
      'jsdoc/require-jsdoc': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      'unicorn/no-useless-undefined': 'off',
    },
  },
];
