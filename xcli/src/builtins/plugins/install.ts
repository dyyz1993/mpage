import type { BuiltinCommand } from '../info.js';

const installCommand: BuiltinCommand = {
  name: 'install',
  description: '安装插件',
  aliases: ['i'],
  help: {
    usage: 'xcli install <source>',
    description: '从指定源安装插件',
    options: [],
    examples: [
      { cmd: 'xcli i npm:@some/pkg', description: '从 npm 安装' },
      { cmd: 'xcli i git:https://...', description: '从 git 安装' },
      { cmd: 'xcli i ../my-plugin', description: '从本地路径安装' },
      { cmd: 'xcli i doubao', description: '从官方 store 安装' },
    ],
  },
  execute: async (args, _options, _ctx) => {
    const [source] = args;

    if (!source) {
      console.log('用法: xcli install <source>');
      console.log('');
      console.log('支持的安装源:');
      console.log('  npm:@scope/name   从 npm 安装');
      console.log('  git:url           从 git 安装');
      console.log('  ../path           从本地路径安装');
      console.log('  name              从官方 store 安装');
      process.exit(1);
    }

    console.log(`正在安装插件: ${source}`);
    console.log('(安装功能待实现)');

    if (source.startsWith('npm:')) {
      console.log(`  源类型: npm`);
      console.log(`  包名: ${source.slice(4)}`);
    } else if (source.startsWith('git:')) {
      console.log(`  源类型: git`);
      console.log(`  URL: ${source.slice(4)}`);
    } else if (source.startsWith('./') || source.startsWith('../') || source.startsWith('/')) {
      console.log(`  源类型: 本地路径`);
    } else {
      console.log(`  源类型: 官方 store`);
    }

    console.log('');
    console.log('提示: 使用 xcli plugins 查看已安装插件');
  },
};

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
  execute: async (args, _options, ctx) => {
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
  execute: async () => {
    console.log('用法: xcli plugins [list]');
    console.log('可用子命令: list');
  },
};

export const installBuiltin: BuiltinCommand = {
  name: 'install',
  description: '安装插件',
  aliases: ['i'],
  help: {
    usage: 'xcli install <source>',
    description: '安装插件',
    options: [],
    examples: [{ cmd: 'xcli i npm:lodash', description: '安装 lodash' }],
  },
  execute: installCommand.execute,
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
  execute: removeCommand.execute,
};
