import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/build/**', '**/.githooks/**'],
  },
  js.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    rules: {
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: true,
      },
    },
    rules: {
      curly: ['error', 'all'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'FunctionDeclaration',
          message: 'Use an arrow function instead of a function declaration.',
        },
        {
          selector: 'FunctionExpression',
          message: 'Use an arrow function instead of a function expression.',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'assert',
          property: 'equal',
          message: 'Use assert.deepStrictEqual on the full object instead of a partial assertion.',
        },
        {
          object: 'assert',
          property: 'strictEqual',
          message: 'Use assert.deepStrictEqual on the full object instead of a partial assertion.',
        },
        {
          object: 'assert',
          property: 'deepEqual',
          message: 'Use assert.deepStrictEqual on the full object instead of a partial assertion.',
        },
      ],
    },
  },
  prettier,
);
