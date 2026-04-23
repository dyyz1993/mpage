import { Plugin } from '../../protocol/plugin-protocol.js';
import { BuiltinCommand, BuiltinContext } from '../info.js';
import { formatTable } from '../../core/output-formatter.js';
import { detectOutputMode, formatOutput } from '../../core/output-formatter.js';

const listCommand: BuiltinCommand = {
  name: 'list',
  description: '列出已安装的插件',
  aliases: [],
  help: {
    usage: 'xcli plugins [list]',
    description: '列出所有已安装的插件',
    options: [
      { name: '--json', description: '输出 JSON 格式' },
      { name: '--yaml', description: '输出 YAML 格式' },
    ],
    examples: [
      { cmd: 'xcli plugins', description: '列出所有插件' },
      { cmd: 'xcli plugins list', description: '同上' },
    ],
  },
  execute: async (args, options, ctx) => {
    const plugins = Array.from(ctx.plugins.values());
    const opts = detectOutputMode(options);

    const data = {
      plugins: plugins.map((p) => ({
        name: p.name,
        version: p.version,
        source: ctx.getPluginSource(p.name) || 'unknown',
        description: p.description || '',
      })),
    };

    if (opts.mode === 'json' || opts.mode === 'yaml') {
      console.log(formatOutput(data, opts));
      return;
    }

    if (plugins.length === 0) {
      console.log('暂无已安装的插件');
      return;
    }

    const headers = ['Name', 'Source', 'Version'];
    const rows = plugins.map((p) => [p.name, ctx.getPluginSource(p.name) || 'unknown', p.version]);

    console.log(formatTable(headers, rows, { color: opts.color }));
  },
};

export const pluginsBuiltin: BuiltinCommand = {
  name: 'plugins',
  description: '插件管理',
  aliases: [],
  help: {
    usage: 'xcli plugins [list]',
    description: '插件管理命令',
    options: [],
    examples: [
      { cmd: 'xcli plugins', description: '列出已安装插件' },
      { cmd: 'xcli plugins list', description: '同上' },
    ],
  },
  execute: async (args, options, ctx) => {
    const [subCmd] = args;

    if (!subCmd || subCmd === 'list') {
      await listCommand.execute([], options, ctx);
      return;
    }

    console.log(`未知子命令: ${subCmd}`);
    console.log('可用子命令: list');
  },
};

pluginsBuiltin.aliases = [];
