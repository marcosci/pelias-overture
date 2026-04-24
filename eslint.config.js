'use strict';

const js = require('@eslint/js');
const globals = require('globals');

const common = {
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'commonjs',
    globals: {
      ...globals.node,
      ...globals.jest
    }
  },
  rules: {
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-console': 'off',
    'prefer-const': 'error',
    eqeqeq: ['error', 'smart']
  }
};

module.exports = [
  js.configs.recommended,
  {
    ...common,
    files: ['**/*.js']
  },
  {
    ...common,
    files: ['bin/start']
  },
  {
    ignores: ['node_modules/', 'coverage/', 'test/fixtures/overture/']
  }
];
