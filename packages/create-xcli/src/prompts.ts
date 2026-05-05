export interface PromptResult {
  projectName: string;
  template: string;
  variables: Record<string, string>;
}

export function parseCliArgs(argv: string[]): {
  projectName: string | undefined;
  template: string | undefined;
  extras: string[];
} {
  const args = argv.slice(2);
  let projectName: string | undefined;
  let template: string | undefined;
  const extras: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--template' || arg === '-t') {
      template = args[++i];
    } else if (arg?.startsWith('--template=')) {
      template = arg.split('=')[1];
    } else if (arg && !arg.startsWith('-')) {
      if (!projectName) {
        projectName = arg;
      } else {
        extras.push(arg);
      }
    }
  }

  return { projectName, template, extras };
}

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function colorize(text: string, color: keyof typeof COLORS): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

export { colorize, COLORS };

export function printBanner(): void {
  console.log('');
  console.log(colorize('  ╔══════════════════════════════╗', 'cyan'));
  console.log(colorize('  ║    Create XCLI Project       ║', 'cyan'));
  console.log(colorize('  ╚══════════════════════════════╝', 'cyan'));
  console.log('');
}

export function printTemplates(
  templates: Array<{ name: string; description: string }>,
  defaultName: string
): void {
  console.log(colorize('Available templates:', 'bold'));
  console.log('');
  for (const t of templates) {
    const marker = t.name === defaultName ? colorize(' (default)', 'dim') : '';
    console.log(`  ${colorize(t.name, 'green')}  -  ${t.description}${marker}`);
  }
  console.log('');
}

export function printSuccess(
  projectName: string,
  projectDir: string,
  result: { files: string[]; skipped: string[] }
): void {
  console.log('');
  console.log(colorize('✓ Project created successfully!', 'green'));
  console.log('');
  console.log(colorize(`  ${projectName}`, 'bold'));
  console.log(colorize(`  Generated ${result.files.length} file(s)`, 'blue'));

  if (result.skipped.length > 0) {
    console.log(colorize(`  Skipped ${result.skipped.length} existing file(s)`, 'yellow'));
  }

  console.log('');
  console.log(colorize('Next steps:', 'bold'));
  console.log(`  ${colorize(`cd ${projectName}`, 'cyan')}`);
  console.log(`  ${colorize('npm install', 'cyan')}`);
  console.log(`  ${colorize('npm run build', 'cyan')}`);
  console.log(`  ${colorize('npm start', 'cyan')}`);
  console.log('');
}
