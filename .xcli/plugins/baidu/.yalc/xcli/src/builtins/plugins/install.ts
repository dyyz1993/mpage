import { BuiltinCommand, BuiltinContext } from '../../info.js';

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
  execute: async (args, options, ctx) => {
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
  execute: async (args, options, ctx) => {
    await installCommand.execute(args, options, ctx);
  },
};
