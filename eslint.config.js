import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'coverage/', 'dist/', 'logs/', 'prisma/migrations/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['**/*.test.{ts,js}', '**/tests/**/*.{ts,js}'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  }
);
