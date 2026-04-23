import { Plugin } from '../protocol/plugin-protocol.js';
import { formatTable } from '../core/output-formatter.js';
import { detectOutputMode, formatOutput } from '../core/output-formatter.js';

export interface BuiltinCommand {
  name: string;
  description: string;
  aliases?: string[];
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
  plugins: Map<string, Plugin>;
  loadPlugin: (name: string) => Promise<Plugin | null>;
  getPluginSource: (name: string) => string | null;
}

const infoCommand: BuiltinCommand = {
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
  execute: async (args, options, ctx) => {
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

    const data = {
      plugin: plugin.name,
      version: plugin.version,
      source: source || 'unknown',
      description: plugin.description || '',
      status: 'loaded',
      commands: commands.map((c) => ({
        scope: c.scope,
        name: c.command.name,
        description: c.command.description,
      })),
    };

    const opts = detectOutputMode(options);

    if (opts.mode === 'text') {
      const bold = opts.color ? '\x1b[1m' : '';
      const reset = opts.color ? '\x1b[0m' : '';
      const dim = opts.color ? '\x1b[2m' : '';

      console.log(`${bold}插件:${reset} ${plugin.name}`);
      console.log(`${bold}版本:${reset} ${plugin.version}`);
      console.log(`${bold}来源:${reset} ${source || 'unknown'}`);
      console.log(`${bold}描述:${reset} ${plugin.description || '(无)'}`);
      console.log(`${bold}状态:${reset} ${dim}✓ 已加载${reset}`);
      console.log('');
      console.log(`${bold}命令:${reset}`);

      for (const cmd of commands) {
        const prefix = cmd.scope !== plugin.name ? `${cmd.scope} ` : '';
        console.log(`  ${prefix}${cmd.command.name}  ${cmd.command.description}`);
      }
    } else {
      console.log(formatOutput(data, opts));
    }
  },
};

export const builtins: BuiltinCommand[] = [infoCommand];

export function getBuiltin(name: string): BuiltinCommand | undefined {
  return builtins.find((b) => b.name === name || b.aliases?.includes(name));
}

export function getAllBuiltins(): { name: string; description: string }[] {
  return builtins.map((b) => ({ name: b.name, description: b.description }));
}

function getPluginCommands(plugin: Plugin) {
  const commands: { scope: string; command: any }[] = [];

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
