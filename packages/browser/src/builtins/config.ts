import type { BuiltinCommand } from './info.js';
import {
  setConfigValue,
  getConfigValue,
  getAllConfigKeys,
  CONFIG_KEY_MAP,
  CONFIG_FILE,
} from '@xcli/core';
import { listGuardRules, addGuardRule, removeGuardRule, setGuardIdentityKey } from '@xcli/core';
import type { Core } from '@xcli/core';

export const configBuiltin: BuiltinCommand = {
  name: 'config',
  description: '管理 xcli 配置',
  aliases: [],
  help: {
    usage: 'xcli config <set|get|list|guard> [key] [value]',
    description: '查看或修改 xcli 持久化配置 (~/.xcli/config.json)',
    options: [],
    examples: [
      { cmd: 'xcli config list', description: '列出所有配置项' },
      { cmd: 'xcli config get viewer.host', description: '查看某项配置' },
      {
        cmd: 'xcli config set viewer.host https://viewer.example.com:8443',
        description: '设置配置项',
      },
      {
        cmd: 'xcli config set browser.executablePath /usr/bin/chromium',
        description: '设置浏览器路径',
      },
      { cmd: 'xcli config set daemon.port 9090', description: '设置 daemon 端口' },
      { cmd: 'xcli config guard', description: '查看所有 guard 规则' },
      {
        cmd: 'xcli config guard identity-key XCLI_AGENT_ROLE',
        description: '设置身份识别的环境变量名',
      },
      {
        cmd: 'xcli config guard add main --match "*" --block "screenshot,open" --message "请用子Agent"',
        description: '添加 guard 规则',
      },
      { cmd: 'xcli config guard remove main', description: '删除 guard 规则' },
    ],
  },
  // eslint-disable-next-line require-await
  execute: async (args, _options, ctx) => {
    const core = ctx.core as Core | undefined;
    const [subcommand, ...rest] = args;

    if (!subcommand || subcommand === 'list') {
      const keys = getAllConfigKeys();

      console.log(`配置文件: ${CONFIG_FILE}`);
      console.log('');

      for (const k of keys) {
        const desc = CONFIG_KEY_MAP[k]?.description || '';
        const val = core ? getConfigValue(core, k) : undefined;
        console.log(`  ${k}`);
        console.log(`    描述: ${desc}`);
        console.log(`    当前: ${val !== undefined ? val : '(未设置，使用默认值)'}`);
        console.log('');
      }
      return;
    }

    if (subcommand === 'get') {
      const key = rest[0];
      if (!key) {
        console.error('用法: xcli config get <key>');
        process.exit(1);
      }
      if (!CONFIG_KEY_MAP[key]) {
        console.error(`未知配置项: ${key}`);
        console.error(`可用配置项: ${getAllConfigKeys().join(', ')}`);
        process.exit(1);
      }
      const val = core ? getConfigValue(core, key) : undefined;
      console.log(val !== undefined ? val : '(未设置，使用默认值)');
      return;
    }

    if (subcommand === 'set') {
      const [key, value] = rest;
      if (!key || !value) {
        console.error('用法: xcli config set <key> <value>');
        process.exit(1);
      }
      if (!CONFIG_KEY_MAP[key]) {
        console.error(`未知配置项: ${key}`);
        console.error(`可用配置项: ${getAllConfigKeys().join(', ')}`);
        process.exit(1);
      }
      if (!core) {
        console.error('Core instance not available');
        process.exit(1);
      }
      const ok = setConfigValue(core, key, value);
      if (!ok) {
        console.error(`设置失败，请检查值是否合法`);
        process.exit(1);
      }
      console.log(`✓ ${key} = ${value}`);
      return;
    }

    if (subcommand === 'guard') {
      handleGuard(rest, core);
      return;
    }

    console.error(`未知子命令: ${subcommand}`);
    console.error('用法: xcli config <set|get|list|guard>');
    process.exit(1);
  },
};

function handleGuard(args: string[], core?: Core): void {
  const [action, ...rest] = args;

  if (!action || action === 'help' || action === '--help') {
    console.log('用法: xcli config guard <子命令> [选项]');
    console.log('');
    console.log('子命令:');
    console.log('  (无参数)              显示本帮助');
    console.log('  list                 查看所有 guard 规则');
    console.log('  identity-key <变量名> 设置身份识别的环境变量名');
    console.log('  add <身份> [选项]     添加 guard 规则');
    console.log('  remove <身份>         删除 guard 规则');
    console.log('');
    console.log('add 选项:');
    console.log('  --match <模式>  匹配的命令列表，逗号分隔（默认匹配全部）');
    console.log('  --block <命令>  要拦截的命令列表，逗号分隔');
    console.log('  --message <提示> 拦截时返回的提示信息');
    console.log('');
    console.log('模式支持:');
    console.log('  *         匹配所有命令');
    console.log('  open*     前缀匹配');
    console.log('  *shot     后缀匹配');
    console.log('  *scree*   包含匹配');
    console.log('  click     精确匹配');
    console.log('');
    console.log('示例:');
    console.log('  xcli config guard');
    console.log('  xcli config guard list');
    console.log('  xcli config guard identity-key XCLI_AGENT_ROLE');
    console.log(
      '  xcli config guard add main --match "*" --block "screenshot,open,click" --message "请使用子Agent执行"'
    );
    console.log('  xcli config guard add sub --match "*" --block "" --message ""');
    console.log('  xcli config guard remove main');
    return;
  }

  if (action === 'list') {
    const config = core ? listGuardRules(core) : null;
    if (!config) {
      console.log('(未配置 guard 规则)');
      return;
    }
    console.log(`身份识别变量: ${config.identityKey}`);
    console.log('');
    for (const [identity, rule] of Object.entries(config.rules)) {
      console.log(`  [${identity}]`);
      console.log(`    匹配命令: ${rule.match.join(', ') || '(全部)'}`);
      console.log(`    拦截命令: ${rule.block.join(', ') || '(无)'}`);
      console.log(`    提示信息: ${rule.message || '(无)'}`);
      console.log('');
    }
    return;
  }

  if (action === 'identity-key') {
    const key = rest[0];
    if (!key) {
      console.error('用法: xcli config guard identity-key <环境变量名>');
      process.exit(1);
    }
    setGuardIdentityKey(core!, key);
    console.log(`✓ 身份识别变量 = ${key}`);
    return;
  }

  if (action === 'add') {
    const identity = rest[0];
    if (!identity) {
      console.error(
        '用法: xcli config guard add <身份> --match <匹配> --block <拦截> --message <提示>'
      );
      process.exit(1);
    }

    let match: string[] = [];
    let block: string[] = [];
    let message = '';

    for (let i = 1; i < rest.length; i++) {
      if (rest[i] === '--match' && rest[i + 1]) {
        match = rest[i + 1].split(',').map((s) => s.trim());
        i++;
      } else if (rest[i] === '--block' && rest[i + 1]) {
        block = rest[i + 1].split(',').map((s) => s.trim());
        i++;
      } else if (rest[i] === '--message' && rest[i + 1]) {
        message = rest.slice(i + 1).join(' ');
        break;
      }
    }

    addGuardRule(core!, identity, { match, block, message });
    console.log(`✓ 已添加 guard 规则 [${identity}]`);
    console.log(`  匹配: ${match.join(', ') || '(全部)'}`);
    console.log(`  拦截: ${block.join(', ') || '(无)'}`);
    console.log(`  提示: ${message || '(无)'}`);
    return;
  }

  if (action === 'remove') {
    const identity = rest[0];
    if (!identity) {
      console.error('用法: xcli config guard remove <身份>');
      process.exit(1);
    }
    const ok = core ? removeGuardRule(core, identity) : false;
    if (!ok) {
      console.error(`规则 [${identity}] 不存在`);
      process.exit(1);
    }
    console.log(`✓ 已删除 guard 规则 [${identity}]`);
    return;
  }

  console.error(`未知 guard 子命令: ${action}`);
  console.error('用法: xcli config guard [add|remove|identity-key]');
  process.exit(1);
}
