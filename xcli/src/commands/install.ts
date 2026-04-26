import { mkdirSync, writeFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';
import type { CommandValues } from '../core/types';

const OFFICIAL_TEMPLATES = ['static', 'dynamic', 'login', 'api'];

const GLOBAL_PLUGINS_DIR = join(homedir(), '.xcli', 'plugins');
const LOCAL_PLUGINS_DIR = '.xcli/plugins';

export async function installCommand(args: string[], values: CommandValues) {
  const isGlobal = Boolean(values.global || values.g || (!values.project && !values.p));
  const isForce = Boolean(values.force || values.f);
  const source = args[0];

  if (!source) {
    console.error('Usage: xcli install [flags] <source>');
    console.error('');
    console.error('Flags:');
    console.error('  -g, --global    全局安装 (默认)');
    console.error('  -p, --project  本地安装到 .xcli/plugins/');
    console.error('  -f, --force    覆盖已存在的插件');
    console.error('');
    console.error('Sources:');
    console.error('  git:<url>         Git repository');
    console.error('  npm:<package>     NPM package');
    console.error('  github:<user/repo>  GitHub repository');
    console.error('  <name>            Official template: ' + OFFICIAL_TEMPLATES.join(', '));
    process.exit(1);
  }

  const pluginsDir = isGlobal ? GLOBAL_PLUGINS_DIR : LOCAL_PLUGINS_DIR;
  const location = isGlobal ? '[global]' : '[local]';

  mkdirSync(pluginsDir, { recursive: true });

  if (source.startsWith('git:')) {
    const url = source.slice(4);
    const name = extractNameFromUrl(url);
    await gitClone(url, name, pluginsDir, isForce, location);
  } else if (source.startsWith('npm:')) {
    const packageName = source.slice(4);
    await npmInstall(packageName, pluginsDir, isForce, location);
  } else if (source.startsWith('github:')) {
    const repo = source.slice(7);
    const url = `https://github.com/${repo}.git`;
    const name = repo.split('/')[1] || repo;
    await gitClone(url, name, pluginsDir, isForce, location);
  } else if (OFFICIAL_TEMPLATES.includes(source)) {
    await installOfficialTemplate(source, pluginsDir, isForce, location);
  } else {
    console.error(`Unknown source: ${source}`);
    console.error(`Official templates: ${OFFICIAL_TEMPLATES.join(', ')}`);
    process.exit(1);
  }
}

function extractNameFromUrl(url: string): string {
  const match = url.match(/([^/]+?)(?:\.git)?$/);
  return match ? match[1] : 'plugin';
}

async function gitClone(
  url: string,
  name: string,
  pluginsDir: string,
  force: boolean,
  location: string
) {
  const targetDir = join(pluginsDir, name);
  if (existsSync(targetDir)) {
    if (!force) {
      console.error(`Plugin "${name}" already exists at ${targetDir}`);
      console.error('Use -f to overwrite');
      process.exit(1);
    }
    rmSync(targetDir, { recursive: true, force: true });
  }
  console.log(`Cloning ${url}...`);
  try {
    execSync(`git clone ${url} ${targetDir}`, { stdio: 'inherit' });
    console.log(`Installed: ${name} ${location}`);
  } catch {
    console.error(`Failed to clone ${url}`);
    process.exit(1);
  }
}

async function npmInstall(
  packageName: string,
  pluginsDir: string,
  force: boolean,
  location: string
) {
  const targetDir = join(pluginsDir, packageName);
  if (existsSync(targetDir)) {
    if (!force) {
      console.error(`Plugin "${packageName}" already exists at ${targetDir}`);
      console.error('Use -f to overwrite');
      process.exit(1);
    }
    rmSync(targetDir, { recursive: true, force: true });
  }

  console.log(`Installing ${packageName}...`);
  try {
    mkdirSync(targetDir, { recursive: true });

    execSync(`npm pack ${packageName} --pack-destination /tmp`, { stdio: 'pipe' });

    const files = execSync('ls -t /tmp/*.tgz', { encoding: 'utf-8' })
      .split('\n')
      .map((f: string) => f.trim())
      .filter(Boolean);
    const tarball = files[0];

    if (!tarball || !existsSync(tarball)) {
      console.error(`Failed to download ${packageName}`);
      process.exit(1);
    }

    execSync(`tar -xzf "${tarball}" -C "${targetDir}" --strip-components=1`, { stdio: 'pipe' });
    rmSync(tarball, { force: true });

    console.log(`Installed: ${packageName} ${location}`);
  } catch (err) {
    console.error(`Failed to install ${packageName}: ${err instanceof Error ? err.message : err}`);
    if (existsSync(targetDir)) {
      rmSync(targetDir, { recursive: true, force: true });
    }
    process.exit(1);
  }
}

async function installOfficialTemplate(
  name: string,
  pluginsDir: string,
  force: boolean,
  location: string
) {
  const targetDir = join(pluginsDir, name);
  if (existsSync(targetDir)) {
    if (!force) {
      console.error(`Plugin "${name}" already exists at ${targetDir}`);
      console.error('Use -f to overwrite');
      process.exit(1);
    }
    rmSync(targetDir, { recursive: true, force: true });
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
    handler: async (_params: Record<string, unknown>, ctx: Record<string, unknown>) => {
      await ctx.page.goto(plugin.url);
      await ctx.page.waitForLoadState('domcontentloaded');
      return { data: [], tips: ['采集完成'] };
    },
  });

  plugin.command('verify', {
    description: '校验数据',
    parameters: {},
    handler: async (_params: Record<string, unknown>, ctx: Record<string, unknown>) => {
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

  console.log(`Installed: ${name} ${location} (official template)`);
}

export { GLOBAL_PLUGINS_DIR, LOCAL_PLUGINS_DIR };
