module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      fixStyle: 'inline-type-imports',
    }],
    'no-console': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'prettier/prettier': 'error',
    'no-useless-escape': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'multi-line'],
    'no-throw-literal': 'error',
    'no-return-await': 'error',
    'prefer-promise-reject-errors': 'error',
    'require-await': 'error',
    '@typescript-eslint/naming-convention': ['error', {
      selector: 'interface',
      format: ['PascalCase'],
      custom: { regex: '^I[A-Z]', match: false },
    }, {
      selector: 'class',
      format: ['PascalCase'],
    }],
  },
  ignorePatterns: ['dist', 'node_modules', '*.js', 'xcli/'],
  overrides: [
    {
      files: ['**/__tests__/**/*.ts', 'tests/**/*.ts'],
      rules: {
        'require-await': 'off',
        'no-return-await': 'off',
        'no-throw-literal': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
};
