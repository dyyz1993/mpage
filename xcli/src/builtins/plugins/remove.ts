import { BuiltinCommand } from '../../info.js';

const removeCommand: BuiltinCommand = {
  name: 'remove',
  description: '卸载插件',
  aliases: ['rm', 'uninstall'],
  help: {
    usage: 'xcli remove <name>',
    description: '卸载已安装的插件',
    options: [],
    examples: [
      { cmd: 'xcli rm doubao', description: '卸载 doubao 插件' },
      { cmd: 'xcli remove doubao', description: '同上' },
    ],
  },
  execute: async (args, options, ctx) => {
    const [name] = args;

    if (!name) {
      console.log('用法: xcli remove <name>');
      console.log('');
      console.log('可用插件:');
      for (const [pluginName] of ctx.plugins) {
        console.log(`  ${pluginName}`);
      }
      process.exit(1);
    }

    console.log(`正在卸载插件: ${name}`);
    console.log('(卸载功能待实现)');
  },
};

export const removeBuiltin: BuiltinCommand = {
  name: 'remove',
  description: '卸载插件',
  aliases: ['rm', 'uninstall'],
  help: {
    usage: 'xcli remove <name>',
    description: '卸载插件',
    options: [],
    examples: [{ cmd: 'xcli rm doubao', description: '卸载 doubao' }],
  },
  execute: async (args, options, ctx) => {
    await removeCommand.execute(args, options, ctx);
  },
};
