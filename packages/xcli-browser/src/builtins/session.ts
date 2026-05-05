import type { BuiltinCommand } from './info.js';
import {
  openSession,
  htmlSession,
  closeSession,
  listSessions,
  closeAllSessions,
  getCookies,
  clearCookies,
  getLocalStorage,
  setLocalStorage,
  clearLocalStorage,
  setCookie,
} from '../session/browser-session-client.js';

console.error('Warning: session builtin requires daemon-manager. Some features may not work.');

const stub = (name: string): BuiltinCommand => ({
  name,
  description: `${name} (stub - requires daemon)`,
  help: { usage: `xcli ${name}`, description: `${name} command`, options: [] },
  // eslint-disable-next-line require-await
  execute: async () => {
    console.error(`Error: ${name} requires daemon-manager which is not in @xcli/browser`);
    process.exit(1);
  },
});

export const daemonBuiltin: BuiltinCommand = {
  name: 'daemon',
  description: '启动/停止 xcli daemon',
  aliases: ['d'],
  help: {
    usage: 'xcli daemon [start|stop|status]',
    description: '管理 xcli daemon 进程',
    options: [],
    examples: [
      { cmd: 'xcli daemon start', description: '启动 daemon' },
      { cmd: 'xcli daemon stop', description: '停止 daemon' },
      { cmd: 'xcli daemon status', description: '查看 daemon 状态' },
    ],
  },
  // eslint-disable-next-line require-await
  execute: async () => {
    console.error('Error: daemon builtin requires daemon-manager. Use @xcli/daemon package.');
    process.exit(1);
  },
};

export const openBuiltin: BuiltinCommand = {
  name: 'open',
  description: '打开页面创建 session',
  aliases: [],
  help: {
    usage: 'xcli open <url> [--session <name>]',
    description: '打开指定 URL 并创建 session',
    options: [{ name: '--session <name>', description: 'Session 名称 (默认: default)' }],
    examples: [
      { cmd: 'xcli open https://qq.com', description: '打开 qq.com' },
      { cmd: 'xcli open https://qq.com --session qq', description: '使用 qq session 打开' },
    ],
  },
  execute: async (args, options, _ctx) => {
    const [url] = args;
    const sessionName = (options['session'] as string) || 'default';

    if (!url) {
      console.log('用法: xcli open <url> [--session <name>]');
      process.exit(1);
    }

    try {
      const info = await openSession(sessionName, url);
      console.log(`Session "${info.name}" opened: ${info.url}`);
      console.log(`ID: ${info.id}`);
      console.log('');
      console.log(`查看实时画面: xcli viewer ${info.id}`);
    } catch (e: unknown) {
      console.error('Error:', e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  },
};

export const sessionsBuiltin: BuiltinCommand = {
  name: 'sessions',
  description: '列出所有 session',
  aliases: ['ss'],
  help: {
    usage: 'xcli sessions',
    description: '列出所有活动的 session',
    options: [],
    examples: [{ cmd: 'xcli sessions', description: '列出所有 session' }],
  },
  execute: async () => {
    try {
      const sessions = await listSessions();
      if (sessions.length === 0) {
        console.log('No active sessions');
        return;
      }
      console.log('Active sessions:');
      for (const s of sessions) {
        console.log(`  ${s.name} - ${s.id}`);
      }
    } catch (e: unknown) {
      console.error('Error:', e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  },
};

export const statusBuiltin: BuiltinCommand = {
  name: 'status',
  description: '查看 xcli daemon 状态',
  aliases: [],
  help: {
    usage: 'xcli status',
    description: '查看 daemon 和 session 状态',
    options: [],
    examples: [{ cmd: 'xcli status', description: '查看状态' }],
  },
  // eslint-disable-next-line require-await
  execute: async () => {
    console.error('Error: status builtin requires daemon-manager. Use @xcli/daemon package.');
    process.exit(1);
  },
};

export const htmlBuiltin: BuiltinCommand = {
  name: 'html',
  description: '获取当前页面 HTML',
  help: {
    usage: 'xcli html [--session <name>]',
    description: '获取当前打开页面的 HTML 内容',
    options: [{ name: '--session <name>', description: '指定 session (默认: default)' }],
    examples: [
      { cmd: 'xcli html', description: '获取 default session 的 HTML' },
      { cmd: 'xcli html --session qq', description: '获取 qq session 的 HTML' },
    ],
  },
  execute: async (_args, options, _ctx) => {
    const sessionName = options['session'] as string | undefined;
    try {
      const html = await htmlSession(sessionName);
      console.log(html);
    } catch (e: unknown) {
      console.error('Error:', e instanceof Error ? e.message : String(e));
      console.error('Hint: Use "xcli open <url>" first');
      process.exit(1);
    }
  },
};

export const closeBuiltin: BuiltinCommand = {
  name: 'close',
  description: '关闭页面',
  help: {
    usage: 'xcli close [--session <name>]',
    description: '关闭指定的 session',
    options: [
      { name: '--session <name>', description: '指定 session (默认: default)' },
      { name: '--all', description: '关闭所有 session' },
    ],
    examples: [
      { cmd: 'xcli close', description: '关闭 default session' },
      { cmd: 'xcli close --session qq', description: '关闭 qq session' },
      { cmd: 'xcli close --all', description: '关闭所有 session' },
    ],
  },
  execute: async (_args, options, _ctx) => {
    if (options['all']) {
      await closeAllSessions();
      console.log('All sessions closed');
      return;
    }

    const sessionName = options['session'] as string | undefined;
    try {
      await closeSession(sessionName || 'default');
      console.log(`Session "${sessionName || 'default'}" closed`);
    } catch (e: unknown) {
      console.error('Error:', e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  },
};

export const killBuiltin: BuiltinCommand = stub('kill');

export const cookieBuiltin: BuiltinCommand = {
  name: 'cookie',
  description: 'Cookie 管理',
  help: {
    usage: 'xcli cookie [get|set|clear] [--session <name>]',
    description: '管理浏览器 cookie',
    options: [
      { name: '--session <name>', description: '指定 session' },
      { name: '--name <name>', description: 'Cookie 名称 (set 时需要)' },
      { name: '--value <value>', description: 'Cookie 值 (set 时需要)' },
      { name: '--domain <domain>', description: 'Cookie 域名 (set 时需要)' },
    ],
    examples: [
      { cmd: 'xcli cookie get', description: '获取当前 cookie' },
      {
        cmd: 'xcli cookie set --name token --value abc --domain example.com',
        description: '设置 cookie',
      },
      { cmd: 'xcli cookie clear', description: '清除所有 cookie' },
    ],
  },
  execute: async (args, options, _ctx) => {
    const [action] = args;
    const sessionName = options['session'] as string | undefined;

    try {
      if (action === 'get' || !action) {
        const cookies = await getCookies(sessionName);
        if (cookies.length === 0) {
          console.log('No cookies');
          return;
        }
        for (const c of cookies) {
          console.log(`${c.name}=${c.value} (${c.domain})`);
        }
        return;
      }

      if (action === 'set') {
        const name = options['name'] as string;
        const value = options['value'] as string;
        const domain = options['domain'] as string;

        if (!name || !value || !domain) {
          console.log('Usage: xcli cookie set --name <name> --value <value> --domain <domain>');
          process.exit(1);
        }

        await setCookie(name, value, domain, name);
        console.log(`Cookie set: ${name}=${value} for ${domain}`);
        return;
      }

      if (action === 'clear') {
        await clearCookies(sessionName);
        console.log('Cookies cleared');
        return;
      }

      console.log(`Unknown action: ${action}`);
      console.log('Usage: xcli cookie [get|set|clear]');
    } catch (e: unknown) {
      console.error('Error:', e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  },
};

export const localStorageBuiltin: BuiltinCommand = {
  name: 'localStorage',
  description: 'LocalStorage 管理',
  aliases: ['ls'],
  help: {
    usage: 'xcli localStorage [get|set|clear] [--session <name>]',
    description: '管理浏览器 localStorage',
    options: [
      { name: '--session <name>', description: '指定 session' },
      { name: '--key <key>', description: '键名 (set 时需要)' },
      { name: '--value <value>', description: '值 (set 时需要)' },
    ],
    examples: [
      { cmd: 'xcli localStorage get', description: '获取所有 localStorage' },
      { cmd: 'xcli localStorage set --key token --value abc123', description: '设置 localStorage' },
      { cmd: 'xcli localStorage clear', description: '清除所有 localStorage' },
    ],
  },
  execute: async (args, options, _ctx) => {
    const [action] = args;
    const sessionName = options['session'] as string | undefined;

    try {
      if (action === 'get' || !action) {
        const storage = await getLocalStorage(sessionName);
        const entries = Object.entries(storage);
        if (entries.length === 0) {
          console.log('Empty localStorage');
          return;
        }
        for (const [key, value] of entries) {
          console.log(`${key}: ${value}`);
        }
        return;
      }

      if (action === 'set') {
        const key = options['key'] as string;
        const value = options['value'] as string;

        if (!key || value === undefined) {
          console.log('Usage: xcli localStorage set --key <key> --value <value>');
          process.exit(1);
        }

        await setLocalStorage(key, value, sessionName);
        console.log(`localStorage set: ${key}=${value}`);
        return;
      }

      if (action === 'clear') {
        await clearLocalStorage(sessionName);
        console.log('localStorage cleared');
        return;
      }

      console.log(`Unknown action: ${action}`);
      console.log('Usage: xcli localStorage [get|set|clear]');
    } catch (e: unknown) {
      console.error('Error:', e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
  },
};
