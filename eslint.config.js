// @ts-check
import js from '@eslint/js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      '*.config.js',
      '*.config.ts',
      '.github',
      '**/*.ts',
      '**/*.tsx',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
    },
  },
];
