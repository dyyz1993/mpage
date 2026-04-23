import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const OFFICIAL_TEMPLATES = ['static', 'dynamic', 'login', 'api'];

export async function installCommand(args: string[], _values: Record<string, any>) {
  const source = args[0];
  if (!source) {
    console.error('Usage: xcli install <source>');
    console.error('');
    console.error('Sources:');
    console.error('  git:<url>         Git repository');
    console.error('  npm:<package>     NPM package');
    console.error('  github:<user/repo>  GitHub repository');
    console.error('  <name>            Official template: ' + OFFICIAL_TEMPLATES.join(', '));
    process.exit(1);
  }

  const pluginsDir = '.xcli/plugins';
  mkdirSync(pluginsDir, { recursive: true });

  if (source.startsWith('git:')) {
    const url = source.slice(4);
    const name = extractNameFromUrl(url);
    await gitClone(url, name, pluginsDir);
  } else if (source.startsWith('npm:')) {
    const packageName = source.slice(4);
    await npmInstall(packageName, pluginsDir);
  } else if (source.startsWith('github:')) {
    const repo = source.slice(7);
    const url = `https://github.com/${repo}.git`;
    const name = repo.split('/')[1] || repo;
    await gitClone(url, name, pluginsDir);
  } else if (OFFICIAL_TEMPLATES.includes(source)) {
    await installOfficialTemplate(source, pluginsDir);
  } else {
    console.error(`Unknown source: ${source}`);
    console.error(`Official templates: ${OFFICIAL_TEMPLATES.join(', ')}`);
    process.exit(1);
  }
}

function extractNameFromUrl(url: string): string {
  const match = url.match(/\/([^\/]+?)(?:\.git)?$/);
  return match ? match[1] : 'plugin';
}

async function gitClone(url: string, name: string, pluginsDir: string) {
  const targetDir = join(pluginsDir, name);
  if (existsSync(targetDir)) {
    console.error(`Plugin "${name}" already exists`);
    process.exit(1);
  }
  console.log(`Cloning ${url}...`);
  try {
    execSync(`git clone ${url} ${targetDir}`, { stdio: 'inherit' });
    console.log(`Installed: ${name}`);
  } catch {
    console.error(`Failed to clone ${url}`);
    process.exit(1);
  }
}

async function npmInstall(packageName: string, pluginsDir: string) {
  const targetDir = join(pluginsDir, packageName);
  if (existsSync(targetDir)) {
    console.error(`Plugin "${packageName}" already exists`);
    process.exit(1);
  }
  console.log(`Installing ${packageName}...`);
  try {
    mkdirSync(targetDir, { recursive: true });
    execSync(`npm install ${packageName}`, { stdio: 'inherit', cwd: targetDir });
    console.log(`Installed: ${packageName}`);
  } catch {
    console.error(`Failed to install ${packageName}`);
    process.exit(1);
  }
}

async function installOfficialTemplate(name: string, pluginsDir: string) {
  const targetDir = join(pluginsDir, name);
  if (existsSync(targetDir)) {
    console.error(`Plugin "${name}" already exists`);
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });

  const baseUrl = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';

  writeFileSync(
    join(targetDir, 'index.ts'),
    `import type { XCLIAPI } from 'xcli';

const BASE_URL = '${baseUrl}/examples/${name}';

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '${name}',
    url: BASE_URL,
  });

  plugin.command('scrape', {
    description: '采集数据',
    parameters: {},
    handler: async (_params: any, ctx: any) => {
      await ctx.page.goto(plugin.url);
      await ctx.page.waitForLoadState('domcontentloaded');
      return { data: [], tips: ['采集完成'] };
    },
  });

  plugin.command('verify', {
    description: '校验数据',
    parameters: {},
    handler: async (_params: any, ctx: any) => {
      return { data: [], errors: [], tips: [] };
    },
  });
}
`
  );

  writeFileSync(
    join(targetDir, 'package.json'),
    JSON.stringify({ name, version: '1.0.0', type: 'module' }, null, 2)
  );

  console.log(`Installed: ${name} (official template)`);
}
