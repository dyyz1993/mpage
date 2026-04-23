import type { BuiltinCommand } from '../info.js';

export const listBuiltin: BuiltinCommand = {
  name: 'list',
  description: '列出已安装的插件',
  aliases: [],
  help: {
    usage: 'xcli plugins [list]',
    description: '列出所有已安装的插件',
    options: [],
    examples: [
      { cmd: 'xcli plugins', description: '列出所有插件' },
      { cmd: 'xcli plugins list', description: '同上' },
    ],
  },
  execute: async (_args, _options, ctx) => {
    const plugins = Array.from(ctx.plugins.values());

    if (plugins.length === 0) {
      console.log('暂无已安装的插件');
      return;
    }

    console.log('已安装的插件:');
    for (const p of plugins) {
      const source = ctx.getPluginSource(p.name) || 'unknown';
      console.log(`  ${p.name.padEnd(20)} ${source}`);
    }
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
  execute: async (args, _options, ctx) => {
    const [subCmd] = args;

    if (!subCmd || subCmd === 'list') {
      await listBuiltin.execute([], {}, ctx);
      return;
    }

    console.log(`未知子命令: ${subCmd}`);
    console.log('可用子命令: list');
  },
};
