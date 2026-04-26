module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      fixStyle: 'inline-type-imports',
    }],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-console': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'multi-line'],
    'no-throw-literal': 'error',

    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['playwright', 'playwright-core'],
          message: '禁止在 daemon 层直接 import playwright。浏览器操作应在 worker 中执行。如果确实需要，在文件顶部添加 // eslint-disable-next-line no-restricted-imports',
        },
      ],
      paths: [
        {
          name: 'playwright',
          message: '禁止直接 import playwright。通过 WorkerManager 路由到 worker 进程执行。',
        },
      ],
    }],

    '@typescript-eslint/naming-convention': ['error', {
      selector: 'interface',
      format: ['PascalCase'],
      custom: { regex: '^I[A-Z]', match: false },
    }, {
      selector: 'class',
      format: ['PascalCase'],
    }],

    'no-return-await': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-async-promise-executor': 'error',
    'no-promise-executor-return': 'error',
    'require-await': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/', '.xcli/'],
};
