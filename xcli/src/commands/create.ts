import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandValues } from '../core/types';

type TemplateFn = (name: string) => string;

const staticTemplate: TemplateFn = (name) => `import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '${name}',
    url: 'https://example.com',
  });

  site.command('scrape', {
    description: '采集数据',
    parameters: {},
    handler: async (_params: Record<string, unknown>, ctx: Record<string, unknown>) => {
      if (!ctx.page) {
        return { success: false, data: null, message: 'No page available', tips: [] };
      }
      await ctx.page.goto(site.url);
      await ctx.page.waitForLoadState('domcontentloaded');
      return { success: true, data: [], tips: ['采集完成'] };
    },
  });

  site.command('verify', {
    description: '校验数据',
    parameters: {},
    handler: async (_params: Record<string, unknown>, _ctx: Record<string, unknown>) => {
      return { success: true, data: [], errors: [], tips: [] };
    },
  });
}
`;

const dynamicTemplate: TemplateFn = (name) => `import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '${name}',
    url: 'https://example.com',
  });

  site.command('scrape', {
    description: '采集数据（支持分页）',
    parameters: z.object({
      page: z.number().default(1).describe('页码'),
      limit: z.number().default(20).describe('每页数量'),
    }),
    handler: async (params: { page: number; limit: number }, ctx: Record<string, unknown>) => {
      if (!ctx.page) {
        return { success: false, data: null, message: 'No page available', tips: [] };
      }
      const url = new URL(site.url);
      url.searchParams.set('page', String(params.page));
      url.searchParams.set('limit', String(params.limit));
      await ctx.page.goto(url.toString());
      await ctx.page.waitForLoadState('domcontentloaded');
      return { success: true, data: [], tips: ['采集完成'] };
    },
  });

  site.command('verify', {
    description: '校验数据',
    parameters: z.object({
      strict: z.boolean().default(false).describe('严格模式'),
    }),
    handler: async (params: { strict: boolean }, _ctx: Record<string, unknown>) => {
      return { success: true, data: [], errors: [], tips: [\`校验完成 (strict=\${params.strict})\`] };
    },
  });
}
`;

const loginTemplate: TemplateFn = (name) => `import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '${name}',
    url: 'https://example.com',
    requiresLogin: true,
    isLogin: async (ctx) => {
      const token = await ctx.storage.get('auth_token');
      return !!token;
    },
  });

  site.login(async (ctx) => {
    if (!ctx.page) throw new Error('No page available');
    await ctx.page.goto(site.url + '/login');
    await ctx.page.waitForLoadState('domcontentloaded');
    const token = 'simulated-token-' + Date.now();
    await ctx.storage.set('auth_token', token);
  });

  site.logout(async (ctx) => {
    await ctx.storage.delete('auth_token');
  });

  site.command('scrape', {
    description: '采集数据（需要登录）',
    parameters: z.object({
      category: z.string().default('all').describe('分类'),
    }),
    handler: async (params: { category: string }, ctx: Record<string, unknown>) => {
      if (!ctx.page) {
        return { success: false, data: null, message: 'No page available', tips: [] };
      }
      await ctx.page.goto(site.url + '/data?category=' + params.category);
      await ctx.page.waitForLoadState('domcontentloaded');
      return { success: true, data: [], tips: ['采集完成'] };
    },
  });
}
`;

const apiTemplate: TemplateFn = (name) => `import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '${name}',
    url: 'https://api.example.com',
  });

  site.command('fetch', {
    description: '调用 API 获取数据',
    parameters: z.object({
      endpoint: z.string().describe('API 端点'),
      method: z.enum(['GET', 'POST']).default('GET').describe('请求方法'),
    }),
    handler: async (params: { endpoint: string; method: string }, _ctx: Record<string, unknown>) => {
      const url = site.url + params.endpoint;
      return {
        success: true,
        data: { url, method: params.method, status: 'ok' },
        tips: ['API 调用完成'],
      };
    },
  });

  site.command('batch', {
    description: '批量调用 API',
    parameters: z.object({
      endpoints: z.array(z.string()).describe('API 端点列表'),
      concurrency: z.number().default(3).describe('并发数'),
    }),
    handler: async (params: { endpoints: string[]; concurrency: number }, _ctx: Record<string, unknown>) => {
      return {
        success: true,
        data: params.endpoints.map((ep) => ({ endpoint: ep, status: 'ok' })),
        tips: [\`批量完成, concurrency=\${params.concurrency}\`],
      };
    },
  });
}
`;

const TEMPLATES: Record<string, TemplateFn> = {
  static: staticTemplate,
  dynamic: dynamicTemplate,
  login: loginTemplate,
  api: apiTemplate,
};

export async function createCommand(args: string[], values: CommandValues) {
  const name = args[0];
  if (!name) {
    console.error('Usage: xcli create <name> --template <type> [--global|--project]');
    console.error('');
    console.error('Templates: static, dynamic, login, api');
    console.error('Flags: -g/--global (default), -p/--project');
    process.exit(1);
  }

  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(
      `Invalid plugin name "${name}". Use lowercase letters, numbers, hyphens. Must start with a letter.`
    );
    process.exit(1);
  }

  const template = (values.template || values.t || 'static') as string;
  if (!(template in TEMPLATES)) {
    console.error(
      `Unknown template "${template}". Available: ${Object.keys(TEMPLATES).join(', ')}`
    );
    process.exit(1);
  }

  const isGlobal = Boolean(values.global || values.g || (!values.project && !values.p));
  const pluginsDir = isGlobal ? join(homedir(), '.xcli', 'plugins') : '.xcli/plugins';
  const pluginDir = join(pluginsDir, name);

  if (existsSync(pluginDir)) {
    console.error(`Plugin "${name}" already exists at ${pluginDir}`);
    console.error('Use a different name or remove the existing plugin first.');
    process.exit(1);
  }

  mkdirSync(pluginDir, { recursive: true });

  const code = TEMPLATES[template](name);
  writeFileSync(join(pluginDir, 'index.ts'), code);
  writeFileSync(
    join(pluginDir, 'package.json'),
    JSON.stringify({ name, version: '1.0.0', type: 'module' }, null, 2)
  );

  console.log(`Plugin "${name}" created at ${pluginDir}`);
  console.log(`Template: ${template}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Edit ${pluginDir}/index.ts`);
  console.log(`  2. Run: xcli ${name} --help`);
  console.log(`  3. Reload: xcli plugins reload ${name} (if already running)`);
}

export { TEMPLATES };
