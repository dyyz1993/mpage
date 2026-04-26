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

// eslint-disable-next-line require-await -- CLI 命令签名保持 async
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

// eslint-disable-next-line require-await -- CLI 命令签名保持 async
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

const TEMPLATE_GENERATORS: Record<
  string,
  (name: string, baseUrl: string) => { indexTs: string; packageJson: string }
> = {
  static: (name, baseUrl) => ({
    indexTs: `import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

// TODO: 替换为实际目标 URL
const BASE_URL = '${baseUrl}/examples/${name}';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '${name}',
    url: BASE_URL,
  });

  site.command('scrape', {
    description: '采集页面数据',
    parameters: z.object({
      selector: z.string().default('body').describe('CSS 选择器'),
    }),
    handler: async (params, ctx) => {
      if (!ctx.page) throw new Error('No active page. Run xcli open <url> first');
      await ctx.page.goto(site.url);
      await ctx.page.waitForLoadState('domcontentloaded');
      const data = await ctx.page.evaluate((sel: string) => {
        const els = document.querySelectorAll(sel);
        return Array.from(els).map((el) => ({ text: el.textContent?.trim() || '' }));
      }, params.selector);
      return { data, tips: ['采集到 ' + data.length + ' 条数据'] };
    },
  });

  site.command('verify', {
    description: '校验采集结果',
    parameters: z.object({
      minCount: z.number().default(0).describe('最少条数'),
    }),
    handler: async (params, ctx) => {
      if (!ctx.page) throw new Error('No active page. Run xcli open <url> first');
      await ctx.page.goto(site.url);
      await ctx.page.waitForLoadState('domcontentloaded');
      const count = await ctx.page.evaluate(() => document.querySelectorAll('body *').length);
      const errors = count < params.minCount ? ['数据条数不足: ' + count + ' < ' + params.minCount] : [];
      return { data: { count }, errors, tips: ['页面元素数: ' + count] };
    },
  });
}
`,
    packageJson: JSON.stringify(
      { name, version: '1.0.0', type: 'module', dependencies: { zod: '^3.24.0' } },
      null,
      2
    ),
  }),

  dynamic: (name, baseUrl) => ({
    indexTs: `import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

// TODO: 替换为实际目标 URL，确保页面有动态加载内容
const BASE_URL = '${baseUrl}/examples/${name}';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '${name}',
    url: BASE_URL,
  });

  site.command('scrape', {
    description: '采集动态页面数据（等待内容加载）',
    parameters: z.object({
      selector: z.string().default('.item').describe('等待并采集的 CSS 选择器'),
      waitMs: z.number().default(5000).describe('最长等待时间(ms)'),
      pages: z.number().default(1).describe('采集页数'),
    }),
    handler: async (params, ctx) => {
      if (!ctx.page) throw new Error('No active page. Run xcli open <url> first');
      const allData: Array<{ text: string }> = [];
      for (let page = 1; page <= params.pages; page++) {
        const url = page > 1 ? site.url + '?page=' + page : site.url;
        await ctx.page.goto(url);
        await ctx.page.waitForSelector(params.selector, { timeout: params.waitMs });
        const items = await ctx.page.evaluate((sel: string) => {
          const els = document.querySelectorAll(sel);
          return Array.from(els).map((el) => ({ text: el.textContent?.trim() || '' }));
        }, params.selector);
        allData.push(...items);
      }
      return { data: allData, tips: ['采集到 ' + allData.length + ' 条数据, 共 ' + params.pages + ' 页'] };
    },
  });

  site.command('verify', {
    description: '校验动态页面内容是否加载完成',
    parameters: z.object({
      selector: z.string().default('.item').describe('目标 CSS 选择器'),
      minCount: z.number().default(1).describe('最少条数'),
    }),
    handler: async (params, ctx) => {
      if (!ctx.page) throw new Error('No active page. Run xcli open <url> first');
      await ctx.page.goto(site.url);
      await ctx.page.waitForSelector(params.selector, { timeout: 10000 });
      const count = await ctx.page.evaluate((sel: string) => document.querySelectorAll(sel).length, params.selector);
      const errors = count < params.minCount ? ['元素数不足: ' + count + ' < ' + params.minCount] : [];
      return { data: { count }, errors, tips: ['动态元素数: ' + count] };
    },
  });
}
`,
    packageJson: JSON.stringify(
      { name, version: '1.0.0', type: 'module', dependencies: { zod: '^3.24.0' } },
      null,
      2
    ),
  }),

  login: (name, baseUrl) => ({
    indexTs: `import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

// TODO: 替换为实际目标 URL 和登录表单选择器
const BASE_URL = '${baseUrl}/examples/${name}';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '${name}',
    url: BASE_URL,
    requiresLogin: true,
  });

  site.command('login', {
    description: '登录网站',
    parameters: z.object({
      username: z.string().describe('用户名'),
      password: z.string().describe('密码'),
    }),
    handler: async (params, ctx) => {
      if (!ctx.page) throw new Error('No active page. Run xcli open <url> first');
      await ctx.page.goto(site.url + '/login');
      await ctx.page.waitForLoadState('domcontentloaded');
      // TODO: 替换为实际表单选择器
      await ctx.page.fill('input[name="username"]', params.username);
      await ctx.page.fill('input[name="password"]', params.password);
      await ctx.page.click('button[type="submit"]');
      await ctx.page.waitForLoadState('domcontentloaded');
      await ctx.storage.set('auth_token', { user: params.username, at: Date.now() });
      return { data: { user: params.username }, tips: ['登录成功'] };
    },
  });

  site.command('scrape', {
    description: '采集需要登录的页面数据',
    parameters: z.object({
      selector: z.string().default('body').describe('CSS 选择器'),
    }),
    handler: async (params, ctx) => {
      if (!ctx.page) throw new Error('No active page. Run xcli open <url> first');
      await site.requireLogin();
      await ctx.page.goto(site.url);
      await ctx.page.waitForLoadState('domcontentloaded');
      const data = await ctx.page.evaluate((sel: string) => {
        const els = document.querySelectorAll(sel);
        return Array.from(els).map((el) => ({ text: el.textContent?.trim() || '' }));
      }, params.selector);
      return { data, tips: ['采集到 ' + data.length + ' 条数据'] };
    },
  });

  site.command('logout', {
    description: '退出登录',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      await ctx.storage.delete('auth_token');
      if (ctx.page) {
        await ctx.page.goto(site.url + '/logout').catch(() => {});
      }
      return { data: {}, tips: ['已退出登录'] };
    },
  });
}
`,
    packageJson: JSON.stringify(
      { name, version: '1.0.0', type: 'module', dependencies: { zod: '^3.24.0' } },
      null,
      2
    ),
  }),

  api: (name, baseUrl) => ({
    indexTs: `import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

// TODO: 替换为实际 API base URL
const API_BASE = '${baseUrl}/api/${name}';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '${name}',
    url: API_BASE,
  });

  site.command('fetch', {
    description: '请求 API 数据',
    parameters: z.object({
      endpoint: z.string().default('/list').describe('API 路径'),
      method: z.enum(['GET', 'POST']).default('GET').describe('请求方法'),
      page: z.number().default(1).describe('页码'),
    }),
    handler: async (params) => {
      const url = API_BASE + params.endpoint + '?page=' + params.page;
      const res = await fetch(url, { method: params.method });
      if (!res.ok) throw new Error('API 请求失败: ' + res.status + ' ' + res.statusText);
      const data = await res.json();
      return { data, tips: ['请求: ' + params.method + ' ' + url] };
    },
  });

  site.command('verify', {
    description: '校验 API 可用性',
    parameters: z.object({
      endpoint: z.string().default('/list').describe('API 路径'),
    }),
    handler: async (params) => {
      const url = API_BASE + params.endpoint;
      const res = await fetch(url);
      const errors = !res.ok ? ['API 不可用: ' + res.status] : [];
      const data = res.ok ? await res.json().catch(() => null) : null;
      return { data, errors, tips: ['状态码: ' + res.status] };
    },
  });
}
`,
    packageJson: JSON.stringify(
      { name, version: '1.0.0', type: 'module', dependencies: { zod: '^3.24.0' } },
      null,
      2
    ),
  }),
};

// eslint-disable-next-line require-await -- CLI 命令签名保持 async
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
  const generator = TEMPLATE_GENERATORS[name];
  if (!generator) {
    console.error(`Unknown template: ${name}`);
    console.error(`Available: ${Object.keys(TEMPLATE_GENERATORS).join(', ')}`);
    process.exit(1);
  }

  const { indexTs, packageJson } = generator(name, baseUrl);

  writeFileSync(join(targetDir, 'index.ts'), indexTs);
  writeFileSync(join(targetDir, 'package.json'), packageJson);

  console.log(`Installed: ${name} ${location} (official template: ${name})`);
}

export { GLOBAL_PLUGINS_DIR, LOCAL_PLUGINS_DIR };
