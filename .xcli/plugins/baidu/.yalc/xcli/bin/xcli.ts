#!/usr/bin/env node

import { z } from 'zod';
import { globalLoader } from '../src/core/plugin-loader';
import { helpGenerator } from '../src/core/help-generator';
import { outputFormatter } from '../src/core/output-formatter';
import { buildInputSchema } from '../src/protocol/plugin-protocol';
import type { CommandContext } from '../src/protocol/plugin-protocol';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    printGlobalHelp();
    return;
  }

  const [first, second, ...rest] = args;

  if (second && !second.startsWith('-')) {
    await executeSiteCommand(first, second, rest);
  } else if (!second && globalLoader.getSite(first)) {
    await executeSiteCommand(first, '', []);
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

  if (!cmdName) {
    const isLoggedIn = await site.isLoggedIn();
    const cmds = site.getAllCommands().filter((c: any) => {
      if (c.requiresLogin && !isLoggedIn) return false;
      return true;
    });
    console.log(`Site: ${site.name} (${site.url})`);
    console.log(`Commands: ${cmds.map((c: any) => c.name).join(', ')}`);
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

  if (cmd.requiresLogin) {
    await site.requireLogin();
  }

  const argv = parseArgs(argsArr);

  if (argv.help || argv.h) {
    console.log(`${cmd.name} - ${cmd.description}`);
    if (cmd.parameters) {
      console.log('\nParameters:');
      try {
        const shape = cmd.parameters.shape || {};
        for (const [key, field] of Object.entries(shape)) {
          const f = field as any;
          console.log(`  --${key}: ${f.description || '[any]'}`);
        }
      } catch {
        /* ignore */
      }
    }
    if (cmd.examples) {
      console.log('\nExamples:');
      for (const ex of cmd.examples) {
        console.log(`  $ ${ex.cmd}`);
        console.log(`    ${ex.description}`);
      }
    }
    return;
  }

  try {
    const schema = buildInputSchema(cmd);
    const params = schema.parse(argv);

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
      config: site.config as Record<string, unknown>,
      site,
    };

    const result = await cmd.handler(params, ctx);
    console.log(outputFormatter.format(result, ctx.output));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function executeCommand(cmdName: string, argsArr: string[]) {
  const cmd = globalLoader.getCommand(cmdName);

  if (!cmd) {
    console.log(outputFormatter.formatError(`Command '${cmdName}' not found`));
    process.exit(1);
  }

  const argv = parseArgs(argsArr);

  if (argv.help || argv.h) {
    console.log(helpGenerator.generate(cmd));
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
  };

  try {
    const result = await cmd.handler(ctx);
    console.log(outputFormatter.format(result, ctx.output));
  } catch (error) {
    console.log(outputFormatter.formatError(error as Error));
    process.exit(1);
  }
}

function parseArgs(args: string[]): Record<string, unknown> {
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
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        result[key] = args[i + 1];
        i += 2;
      } else {
        result[key] = true;
        i++;
      }
    } else {
      result._?.push?.(arg);
      i++;
    }
  }

  return result;
}

function printGlobalHelp() {
  const sites = globalLoader.getSites();
  const commands = globalLoader.getAllCommands().filter((c: any) => !c.name.includes(':'));

  console.log(`
xcli - Extensible CLI Framework

Usage:
  xcli <command> [options]        Global command
  xcli <site> <cmd> [options]    Site command

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
  xcli test
  xcli baidu search --query "AI"
  xcli baidu login --username u --password p
  `);
}

globalLoader.loadFromFunction((xcli) => {
  xcli.registerCommand({
    name: 'help',
    description: 'Show help',
    handler: async (ctx: CommandContext) => {
      return { message: 'Use xcli <site> help for more info' };
    },
  });

  xcli.registerCommand({
    name: 'test',
    description: 'Test command',
    handler: async (ctx: CommandContext) => {
      return { ok: true, message: 'Test passed' };
    },
  });

  const baidu = xcli.createSite({
    name: 'baidu',
    url: 'https://www.baidu.com',
    requiresLogin: true,
  });

  const SearchParams = z.object({
    query: z.string().describe('搜索关键词'),
    limit: z.number().optional().default(10).describe('结果数量'),
  });

  const SearchResult = z.object({
    ok: z.boolean(),
    query: z.string(),
    limit: z.number(),
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      })
    ),
  });

  baidu.command('search', {
    description: '百度搜索',
    parameters: SearchParams,
    result: SearchResult,
    requiresLogin: false,
    examples: [
      { cmd: 'xcli baidu search --query "AI"', description: '搜索 AI 相关内容' },
      { cmd: 'xcli baidu search --query "AI" --limit 5', description: '只返回 5 条结果' },
    ],
    tips: ['💡 使用 --query 指定搜索词'],
    handler: async (params, ctx) => {
      const { query, limit } = params;
      return {
        ok: true,
        query,
        limit,
        results: [
          {
            title: `${query} - 百度搜索结果1`,
            url: 'https://example.com/1',
            snippet: '这是搜索结果摘要...',
          },
          {
            title: `${query} - 百度搜索结果2`,
            url: 'https://example.com/2',
            snippet: '这是搜索结果摘要...',
          },
        ],
      };
    },
  });

  const HotsearchResult = z.object({
    ok: z.boolean(),
    items: z.array(
      z.object({
        rank: z.number(),
        title: z.string(),
        url: z.string(),
        heat: z.string().optional(),
      })
    ),
  });

  baidu.command('hotsearch', {
    description: '获取百度热搜',
    parameters: z.object({}),
    result: HotsearchResult,
    requiresLogin: false,
    handler: async (_params, _ctx) => {
      return {
        ok: true,
        items: [
          { rank: 1, title: '热搜话题1', url: 'https://example.com/1', heat: '500万' },
          { rank: 2, title: '热搜话题2', url: 'https://example.com/2', heat: '300万' },
        ],
      };
    },
  });

  const LoginParams = z.object({
    username: z.string().describe('用户名'),
    password: z.string().describe('密码'),
  });

  const LoginResult = z.object({
    ok: z.boolean(),
    message: z.string(),
  });

  baidu.login(async (ctx: CommandContext) => {
    console.log('百度登录中...');
  });

  baidu.logout(async (ctx: CommandContext) => {
    await ctx.storage.delete('auth_token');
  });
});

main().catch(console.error);
