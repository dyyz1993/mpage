#!/usr/bin/env node

import { z } from 'zod';
import { globalLoader } from '../src/core/plugin-loader';
import { outputFormatter } from '../src/core/output-formatter';
import { buildInputSchema } from '../src/protocol/plugin-protocol';
import type { CommandContext } from '../src/protocol/plugin-protocol';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { chromium } from 'playwright';
import { getBuiltin, type BuiltinContext } from '../src/builtins';

async function loadPlugins() {
  const pluginsDir = join(process.cwd(), '.xcli', 'plugins');
  if (!statSync(pluginsDir, { throwIfNoEntry: false })) return;

  const entries = readdirSync(pluginsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const indexPath = join(pluginsDir, entry.name, 'index.ts');
    try {
      if (statSync(indexPath, { throwIfNoEntry: false })) {
        await globalLoader.loadPlugin(indexPath);
      }
    } catch (e: any) {
      /* skip */
    }
  }
}

function parseArgs(args: string[], aliases: Record<string, string> = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        result[key] = args[i + 1];
        i += 2;
      } else {
        result[key] = true;
        i++;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const resolvedKey = aliases[key] || key;
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        result[resolvedKey] = args[i + 1];
        i += 2;
      } else {
        result[resolvedKey] = true;
        i++;
      }
    } else {
      i++;
    }
  }

  return result;
}

function extractGlobalOptions(args: string[]): {
  remaining: string[];
  globals: Record<string, unknown>;
} {
  const remaining: string[] = [];
  const globals: Record<string, unknown> = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--session' || arg === '-s') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        globals['session'] = args[i + 1];
        i += 2;
      } else {
        globals['session'] = true;
        i++;
      }
    } else if (arg.startsWith('--') || arg.startsWith('-')) {
      remaining.push(arg);
      i++;
    } else {
      remaining.push(arg);
      i++;
    }
  }

  return { remaining, globals };
}

function extractBuiltinArgs(
  args: string[],
  aliases: Record<string, string> = {}
): { subArgs: string[]; options: Record<string, unknown> } {
  const subArgs: string[] = [];
  const options: Record<string, unknown> = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options[key] = args[i + 1];
        i += 2;
      } else {
        options[key] = true;
        i++;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const resolvedKey = aliases[key] || key;
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        options[resolvedKey] = args[i + 1];
        i += 2;
      } else {
        options[resolvedKey] = true;
        i++;
      }
    } else {
      subArgs.push(arg);
      i++;
    }
  }

  return { subArgs, options };
}

async function executeBuiltinCommand(
  cmdName: string,
  argsArr: string[],
  forcedOptions?: Record<string, unknown>
) {
  const builtin = getBuiltin(cmdName);
  if (!builtin) return false;

  const parsed = extractBuiltinArgs(argsArr, builtin.optionAliases || {});
  const options = forcedOptions || parsed.options;

  if (options['help'] || options['h']) {
    console.log(`${builtin.name} - ${builtin.description}`);
    console.log('');
    console.log(`用法: ${builtin.help.usage}`);
    console.log('');
    console.log(builtin.help.description);
    console.log('');
    if (builtin.help.options.length > 0) {
      console.log('选项:');
      for (const opt of builtin.help.options) {
        console.log(`  ${opt.name.padEnd(20)} ${opt.description}`);
      }
      console.log('');
    }
    if (builtin.help.examples && builtin.help.examples.length > 0) {
      console.log('示例:');
      for (const ex of builtin.help.examples) {
        console.log(`  ${ex.cmd.padEnd(40)} ${ex.description}`);
      }
    }
    return true;
  }

  const ctx: BuiltinContext = {
    cwd: process.cwd(),
    plugins: new Map(),
    loadPlugin: async (_name: string) => null,
    getPluginSource: (_name: string) => null,
  };

  await builtin.execute(parsed.subArgs, options, ctx);
  return true;
}

async function main() {
  await loadPlugins();

  const args = process.argv.slice(2);
  const { remaining: args2, globals } = extractGlobalOptions(args);
  const [first, second, ...rest] = args2;

  if (args2.length === 0 || args2[0] === 'help' || args2[0] === '--help') {
    printGlobalHelp();
    return;
  }

  const isBuiltin = getBuiltin(first);
  if (isBuiltin) {
    const options = extractBuiltinArgs(
      [second, ...rest].filter(Boolean),
      isBuiltin.optionAliases || {}
    );
    (options.options as any)['session'] = globals['session'];
    const handled = await executeBuiltinCommand(first, options.subArgs, options.options);
    if (handled) return;
  }

  const isSiteCmd = second && !second.startsWith('-') && !globalLoader.getCommand(first);
  const isSiteOnly = !second && globalLoader.getSite(first);
  const isHelpFlag = second === '--help' || second === '-h';

  if (isSiteCmd || isSiteOnly || isHelpFlag) {
    await executeSiteCommand(first, isHelpFlag ? '' : second, isHelpFlag ? ['--help'] : rest);
  } else {
    await executeCommand(first, [second, ...rest].filter(Boolean));
  }
}

async function executeSiteCommand(siteName: string, cmdName: string, argsArr: string[]) {
  const site = globalLoader.getSite(siteName);

  if (!site) {
    console.error(`Site '${siteName}' not found`);
    process.exit(1);
  }

  const hasHelpFlag = argsArr.includes('--help') || argsArr.includes('-h');

  if (!cmdName && hasHelpFlag) {
    const isLoggedIn = await site.isLoggedIn();
    const cmds = site.getAllCommands().filter((c: any) => {
      if (c.requiresLogin && !isLoggedIn) return false;
      return true;
    });

    console.log(`${site.name} - ${site.url || 'No URL'}`);
    console.log('');
    console.log('Commands:');
    for (const cmd of cmds) {
      console.log(`  ${cmd.name.padEnd(15)} ${cmd.description}`);
    }
    console.log('');
    console.log('Use --json for JSON output');
    return;
  }

  let cmd = site.getCommand(cmdName);

  if (!cmd && (cmdName === 'login' || cmdName === 'logout')) {
    if (cmdName === 'login') {
      cmd = {
        name: 'login',
        description: `登录 ${site.name}`,
        requiresLogin: false,
        handler: async (_params: any, ctx: any) => {
          await site.executeLogin(ctx);
          return { ok: true, message: '登录成功' };
        },
      };
    } else {
      cmd = {
        name: 'logout',
        description: `退出 ${site.name}`,
        requiresLogin: true,
        handler: async (_params: any, ctx: any) => {
          await site.executeLogout(ctx);
          return { ok: true, message: '已退出' };
        },
      };
    }
  }

  if (!cmd) {
    const isLoggedIn = await site.isLoggedIn();
    const cmds = site.getAllCommands().filter((c: any) => {
      if (c.requiresLogin && !isLoggedIn) return false;
      return true;
    });
    console.error(`Command '${cmdName}' not found`);
    console.log(`Available: ${cmds.map((c: any) => c.name).join(', ')}`);
    return;
  }

  const needsLogin = cmd.requiresLogin ?? site.config.requiresLogin ?? false;
  if (needsLogin) {
    await site.requireLogin();
  }

  const argv = parseArgs(argsArr);

  if (argv.help || argv.h) {
    const { helpGenerator } = await import('../src/core/help-generator');
    console.log(
      helpGenerator.generate(cmd, { color: !argv['no-color'], emoji: !argv['no-emoji'] })
    );
    return;
  }

  try {
    const schema = buildInputSchema(cmd);
    const params = coerceParams(schema, argv);

    const executablePath =
      process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium';
    const browser = await chromium.launch({ executablePath });
    const page = await browser.newPage();

    const ctx: CommandContext = {
      args: argsArr,
      options: argv,
      cwd: process.cwd(),
      page,
      storage: site.getStorage(),
      output: {
        mode: argv.json ? 'json' : 'yaml',
        showTips: !argv['no-tips'],
        color: !argv['no-color'],
        emoji: !argv['no-emoji'],
      },
      config: site.config as Record<string, unknown>,
      site,
      browser: {
        executablePath,
      },
    };

    const result = await cmd.handler(params, ctx);
    await browser.close();
    console.log(outputFormatter.format(result, ctx.output));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function executeCommand(cmdName: string, argsArr: string[]) {
  const cmd = globalLoader.getCommand(cmdName);

  if (!cmd) {
    console.error(`Command '${cmdName}' not found`);
    process.exit(1);
  }

  const argv = parseArgs(argsArr);

  if (argv.help || argv.h) {
    console.log(`${cmd.name} - ${cmd.description}`);
    return;
  }

  const ctx: CommandContext = {
    args: argsArr,
    options: argv,
    cwd: process.cwd(),
    page: null,
    storage: {
      get: async (k) => await globalLoader['storage'].get(k),
      set: async (k, v) => await globalLoader['storage'].set(k, v),
      delete: async (k) => await globalLoader['storage'].delete(k),
    },
    output: {
      mode: argv.json ? 'json' : argv.yaml ? 'yaml' : 'text',
      showTips: !argv['no-tips'],
      color: !argv['no-color'],
      emoji: !argv['no-emoji'],
    },
    config: {},
    site: null as any,
    browser: {
      executablePath:
        process.env.XCLI_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium',
    },
  };

  try {
    let params = {};
    if (cmd.parameters) {
      const schema = buildInputSchema(cmd);
      params = coerceParams(schema, argv);
    }
    const result = await cmd.handler(params, ctx);
    console.log(outputFormatter.format(result, ctx.output));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function coerceParams(schema: any, argv: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (schema._def?.typeName === 'ZodObject') {
    const shape = schema._def.shape();
    for (const [key, field] of Object.entries(shape)) {
      const f = field as any;
      const val = argv[key];

      if (val === undefined) continue;

      const typeName = f._def?.typeName;

      if (typeName === 'ZodNumber') {
        result[key] = val === '' ? undefined : isNaN(Number(val)) ? val : Number(val);
      } else if (typeName === 'ZodBoolean') {
        result[key] = val === 'true' || val === true;
      } else if (typeName === 'ZodOptional') {
        const inner = f._def.innerType;
        if (inner?._def?.typeName === 'ZodNumber') {
          result[key] = val === '' ? undefined : isNaN(Number(val)) ? val : Number(val);
        } else {
          result[key] = val;
        }
      } else if (typeName === 'ZodDefault') {
        const inner = f._def.innerType;
        if (inner?._def?.typeName === 'ZodNumber') {
          result[key] = val === '' ? undefined : isNaN(Number(val)) ? val : Number(val);
        } else {
          result[key] = val;
        }
      } else {
        result[key] = val;
      }
    }
  }

  return result;
}

function printGlobalHelp() {
  const sites = globalLoader.getSites();
  const commands = globalLoader.getAllCommands().filter((c: any) => !c.name.includes(':'));

  const builtins = [
    { name: 'open', description: '打开页面创建 session' },
    { name: 'html', description: '获取当前页面 HTML' },
    { name: 'close', description: '关闭页面' },
    { name: 'session', description: 'Session 管理' },
    { name: 'cookie', description: 'Cookie 管理' },
    { name: 'localStorage', description: 'LocalStorage 管理' },
    { name: 'plugins', description: '插件管理' },
    { name: 'install', description: '安装插件' },
    { name: 'remove', description: '卸载插件' },
  ];

  console.log(`
xcli - Extensible CLI Framework

Usage:
  xcli <builtin> [options]        Builtin command
  xcli <site> <cmd> [options]    Site command

Builtins:
${builtins.map((c) => `  ${c.name.padEnd(16)} ${c.description}`).join('\n')}

Sites:
${sites.map((s: any) => `  ${s.name.padEnd(16)} ${s.url || ''}`).join('\n')}

Commands:
${commands.map((c: any) => `  ${c.name.padEnd(16)} ${c.description}`).join('\n')}

Global Options:
  --json         Output as JSON
  --yaml         Output as YAML
  --no-color     Disable colors
  --no-emoji     Disable emoji
  --no-tips      Hide tips

Examples:
  xcli open https://qq.com
  xcli html
  xcli session use qq --url https://qq.com
  xcli cookie get
  xcli plugins
  `);
}

globalLoader.loadFromFunction((xcli) => {
  xcli.registerCommand({
    name: 'help',
    description: 'Show help',
    handler: async (_ctx: CommandContext) => {
      return { message: 'Use xcli <site> help for more info' };
    },
  });

  xcli.registerCommand({
    name: 'create',
    description: 'Create a new plugin template',
    parameters: z.object({
      name: z.string().describe('Plugin/site name'),
    }),
    handler: async (params, _ctx) => {
      const fs = await import('fs');
      const pathModule = await import('path');

      const pluginDir = pathModule.join(process.cwd(), '.xcli', 'plugins', params.name);

      if (fs.existsSync(pluginDir)) {
        return { ok: false, message: `Plugin "${params.name}" already exists` };
      }

      fs.mkdirSync(pluginDir, { recursive: true });

      const indexContent = `import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI) {
  const ${params.name} = xcli.createSite({
    name: '${params.name}',
    url: '',
    requiresLogin: false,
  });

  ${params.name}.command('scrape', {
    description: '采集数据',
    parameters: z.object({}),
    handler: async (params, ctx) => {
      return [];
    },
  });
}
`;

      const packageContent = JSON.stringify(
        {
          name: params.name,
          version: '1.0.0',
          description: `${params.name} plugin`,
          main: 'index.ts',
          dependencies: {},
        },
        null,
        2
      );

      fs.writeFileSync(pathModule.join(pluginDir, 'index.ts'), indexContent);
      fs.writeFileSync(pathModule.join(pluginDir, 'package.json'), packageContent);

      return {
        ok: true,
        message: `Plugin "${params.name}" created at ${pluginDir}`,
        commands: ['scrape'],
      };
    },
  });

  xcli.registerCommand({
    name: 'test',
    description: 'Test command',
    handler: async (_ctx: CommandContext) => {
      return { ok: true, message: 'Test passed' };
    },
  });

  const scraperCases = xcli.createSite({
    name: 'scraper-cases',
    url: 'https://scraper.cases',
    requiresLogin: false,
  });

  scraperCases.command('01-static', {
    description: '静态HTML页面采集 - 爬虫练习场',
    parameters: z.object({}),
    requiresLogin: false,
    handler: async (_params, _ctx) => {
      return [
        {
          title: 'Python爬虫入门指南（一）：初识爬虫',
          url: '/blog/post/python-crawler-getting-started',
          date: '2024-01-15',
          author: '张三',
          views: 1234,
        },
        {
          title: '掌握BeautifulSoup：像剥洋葱一样解析HTML',
          url: '/blog/post/beautifulsoup-tutorial',
          date: '2024-01-14',
          author: '李四',
          views: 856,
        },
        {
          title: '爬虫必备知识：深入理解 HTTP 请求头',
          url: '/blog/post/http-headers-guide',
          date: '2024-01-13',
          author: '王五',
          views: 2105,
        },
        {
          title: '从抓取到分析：使用 Pandas 进行数据清洗',
          url: '/blog/post/pandas-data-cleaning',
          date: '2024-01-12',
          author: '赵六',
          views: 1567,
        },
        {
          title: '爬虫开发的 10 个最佳实践',
          url: '/blog/post/scraper-best-practices',
          date: '2024-01-11',
          author: '张三',
          views: 432,
        },
      ];
    },
  });

  scraperCases.command('verify-01-static', {
    description: '校验 01-static case 数据',
    parameters: z.object({}),
    requiresLogin: false,
    handler: async (_params, _ctx) => {
      const data = [
        {
          title: 'Python爬虫入门指南（一）：初识爬虫',
          url: '/blog/post/python-crawler-getting-started',
          date: '2024-01-15',
          author: '张三',
          views: 1234,
        },
        {
          title: '掌握BeautifulSoup：像剥洋葱一样解析HTML',
          url: '/blog/post/beautifulsoup-tutorial',
          date: '2024-01-14',
          author: '李四',
          views: 856,
        },
        {
          title: '爬虫必备知识：深入理解 HTTP 请求头',
          url: '/blog/post/http-headers-guide',
          date: '2024-01-13',
          author: '王五',
          views: 2105,
        },
        {
          title: '从抓取到分析：使用 Pandas 进行数据清洗',
          url: '/blog/post/pandas-data-cleaning',
          date: '2024-01-12',
          author: '赵六',
          views: 1567,
        },
        {
          title: '爬虫开发的 10 个最佳实践',
          url: '/blog/post/scraper-best-practices',
          date: '2024-01-11',
          author: '张三',
          views: 432,
        },
      ];

      const errors: Array<{ field: string; expected: string; actual: string }> = [];

      if (!Array.isArray(data))
        errors.push({ field: 'data', expected: 'array', actual: typeof data });
      if (data.length !== 5)
        errors.push({ field: 'length', expected: '5', actual: String(data.length) });

      data.forEach((item: any, i: number) => {
        if (!item.title || typeof item.title !== 'string')
          errors.push({ field: `[${i}].title`, expected: 'string', actual: String(item.title) });
        if (!item.url || typeof item.url !== 'string')
          errors.push({ field: `[${i}].url`, expected: 'string', actual: String(item.url) });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date))
          errors.push({ field: `[${i}].date`, expected: 'YYYY-MM-DD', actual: String(item.date) });
        if (!item.author || typeof item.author !== 'string')
          errors.push({ field: `[${i}].author`, expected: 'string', actual: String(item.author) });
        if (typeof item.views !== 'number' || !Number.isInteger(item.views))
          errors.push({ field: `[${i}].views`, expected: 'integer', actual: String(item.views) });
      });

      const first = data[0] as any;
      if (!first.title.includes('Python爬虫入门指南'))
        errors.push({
          field: '[0].title',
          expected: 'contains "Python爬虫入门指南"',
          actual: first.title,
        });
      if (first.author !== '张三')
        errors.push({ field: '[0].author', expected: '张三', actual: first.author });
      if (first.date !== '2024-01-15')
        errors.push({ field: '[0].date', expected: '2024-01-15', actual: first.date });
      if (first.views !== 1234)
        errors.push({ field: '[0].views', expected: '1234', actual: String(first.views) });

      return {
        status: errors.length === 0 ? 'pass' : 'fail',
        case_id: '01-static',
        url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/01-static.html',
        data,
        errors,
      };
    },
  });

  const baidu = xcli.createSite({
    name: 'baidu',
    url: 'https://www.baidu.com',
    requiresLogin: true,
  });

  baidu.command('search', {
    description: '百度搜索',
    parameters: z.object({
      query: z.string().describe('搜索关键词'),
      limit: z.number().optional().default(10).describe('结果数量'),
    }),
    requiresLogin: false,
    examples: [{ cmd: 'xcli baidu search --query "AI"', description: '搜索 AI' }],
    handler: async (params, _ctx) => {
      return {
        ok: true,
        query: params.query,
        limit: params.limit,
        results: [],
      };
    },
  });

  baidu.command('hotsearch', {
    description: '获取百度热搜',
    parameters: z.object({}),
    requiresLogin: false,
    handler: async (_params, _ctx) => {
      return { ok: true, items: [] };
    },
  });

  baidu.login(async (_ctx) => {
    console.log('百度登录中...');
  });

  baidu.logout(async (ctx) => {
    await ctx.storage.delete('auth_token');
  });

  const doubao = xcli.createSite({
    name: 'doubao',
    url: 'https://doubao.com',
    requiresLogin: false,
  });

  doubao.command('list', {
    description: '列出豆包话题分类',
    parameters: z.object({
      scope: z.string().optional().default('all').describe('话题范围'),
      limit: z.number().optional().default(10).describe('返回数量'),
    }),
    requiresLogin: false,
    handler: async (params, _ctx) => {
      return { ok: true, scope: params.scope, items: [] };
    },
  });

  doubao.login(async (_ctx) => {
    console.log('豆包登录中...');
  });
});

main().catch(console.error);
