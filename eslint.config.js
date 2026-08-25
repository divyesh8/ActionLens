const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['dist/**', '.expo/**', 'node_modules/**', 'supabase/functions/**'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      'import/namespace': 'off',
      'import/named': 'off',
      'import/default': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'import/no-duplicates': 'off',
    },
  },
]);
