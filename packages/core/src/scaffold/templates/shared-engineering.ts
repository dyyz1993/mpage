import type { TemplateFile } from '../scaffold-engine.js';

/**
 * Shared engineering config files for all CLI templates.
 * Provides eslint, editorconfig, and husky/lint-staged setup.
 */
export function getEngineeringFiles(): TemplateFile[] {
  return [
    {
      path: 'eslint.config.js',
      content: `import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
`,
    },
    {
      path: '.prettierrc',
      content: `{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
`,
    },
    {
      path: '.editorconfig',
      content: `root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
`,
    },
  ];
}

/**
 * Generates the pre-commit hook content.
 * Includes typecheck + lint-staged for comprehensive quality gates.
 */
export function getPreCommitHook(): string {
  return `set -e

echo "🔍 [pre-commit] Running typecheck..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript typecheck failed. Fix all type errors before committing."
  exit 1
fi
echo "✅ Typecheck passed"

echo "🔍 [pre-commit] Running lint-staged..."
npx lint-staged
if [ $? -ne 0 ]; then
  echo "❌ Lint-staged failed. Fix all errors before committing."
  exit 1
fi
echo "✅ [pre-commit] All checks passed!"
`;
}
export function getEngineeringPkgFields(): Record<string, unknown> {
  return {
    scripts: {
      prepare: 'husky',
    },
    'lint-staged': {
      '*.ts': ['eslint --fix'],
    },
  };
}

/**
 * Generates a package.json string with engineering deps merged in.
 * Takes the base package.json content and adds eslint + husky + lint-staged.
 */
export function mergeEngineeringDeps(basePkgJson: string): string {
  const pkg = JSON.parse(basePkgJson);

  pkg.scripts = {
    ...pkg.scripts,
    prepare: 'husky',
  };

  pkg['lint-staged'] = {
    '*.ts': ['prettier --write', 'eslint --fix'],
  };

  pkg.devDependencies = {
    ...pkg.devDependencies,
    husky: '^9.0.0',
    'lint-staged': '^15.0.0',
    'typescript-eslint': '^8.0.0',
    eslint: '^9.0.0',
    globals: '^15.0.0',
    prettier: '^3.0.0',
  };

  return JSON.stringify(pkg, null, 2);
}
