import type { Core } from '@xcli/core';

export interface PluginMeta {
  name: string;
  version?: string;
  description?: string;
  scopes?: Array<{ name: string; commands: Array<{ name: string; description: string }> }>;
  commands?: Array<{ scope?: string; name: string; description: string }>;
}

export interface BuiltinCommand {
  name: string;
  description: string;
  aliases?: string[];
  optionAliases?: Record<string, string>;
  help: {
    usage: string;
    description: string;
    options: { name: string; description: string }[];
    examples?: { cmd: string; description: string }[];
  };
  execute: (args: string[], options: Record<string, unknown>, ctx: BuiltinContext) => Promise<void>;
}

export interface BuiltinContext {
  cwd: string;
  plugins: Map<string, PluginMeta>;
  loadPlugin: (name: string) => Promise<PluginMeta | null>;
  getPluginSource: (name: string) => string | null;
  core?: Core;
}

export const infoBuiltin: BuiltinCommand = {
  name: 'info',
  description: '查看插件详情',
  help: {
    usage: 'xcli info <plugin>',
    description: '查看指定插件的详细信息',
    options: [
      { name: '--json', description: '输出 JSON 格式' },
      { name: '--yaml', description: '输出 YAML 格式' },
    ],
    examples: [{ cmd: 'xcli info doubao', description: '查看 doubao 插件详情' }],
  },
  execute: async (args, _options, ctx) => {
    const [pluginName] = args;

    if (!pluginName) {
      console.log('用法: xcli info <plugin>');
      process.exit(1);
    }

    const plugin = await ctx.loadPlugin(pluginName);

    if (!plugin) {
      console.log(`错误: 插件 "${pluginName}" 不存在`);
      console.log(`提示: 使用 xcli plugins 查看已安装插件`);
      process.exit(1);
    }

    const source = ctx.getPluginSource(pluginName);
    const commands = getPluginCommands(plugin);

    console.log(`插件: ${plugin.name}`);
    console.log(`版本: ${plugin.version}`);
    console.log(`来源: ${source || 'unknown'}`);
    console.log(`描述: ${plugin.description || '(无)'}`);
    console.log(`状态: ✓ 已加载`);
    console.log('');
    console.log('命令:');

    for (const cmd of commands) {
      const prefix = cmd.scope !== plugin.name ? `${cmd.scope} ` : '';
      console.log(`  ${prefix}${cmd.command.name}  ${cmd.command.description}`);
    }
  },
};

export const builtins: BuiltinCommand[] = [infoBuiltin];

export function getBuiltin(name: string): BuiltinCommand | undefined {
  return builtins.find((b) => b.name === name || b.aliases?.includes(name));
}

export function getAllBuiltins(): { name: string; description: string }[] {
  return builtins.map((b) => ({ name: b.name, description: b.description }));
}

function getPluginCommands(plugin: PluginMeta) {
  const commands: { scope: string; command: { name: string; description: string } }[] = [];

  if (plugin.scopes) {
    for (const scope of plugin.scopes) {
      for (const cmd of scope.commands) {
        commands.push({ scope: scope.name, command: cmd });
      }
    }
  }

  if (plugin.commands) {
    for (const cmd of plugin.commands) {
      commands.push({ scope: cmd.scope || plugin.name, command: cmd });
    }
  }

  return commands;
}
