import type { BuiltinCommand } from './info.js';
import { listSessions } from '../core/session-client.js';
import { DAEMON_PORT } from '../core/constants';

export const viewerBuiltin: BuiltinCommand = {
  name: 'viewer',
  description: '打开实时页面查看器',
  aliases: [],
  help: {
    usage: 'xcli viewer [--session <name>]',
    description: '打开实时页面查看器',
    options: [{ name: '--session <name>', description: 'Session 名称 (默认: default)' }],
    examples: [
      { cmd: 'xcli viewer', description: '打开 default session 的 viewer' },
      { cmd: 'xcli viewer --session test', description: '打开 test session 的 viewer' },
    ],
  },
  execute: async (_args, options) => {
    const sessionName = (options['session'] as string) || 'default';

    const sessions = await listSessions();
    const session = sessions.find((s) => s.name === sessionName);

    if (!session) {
      console.error(`Session "${sessionName}" not found`);
      console.log('');
      console.log('可用 sessions:');
      for (const s of sessions) {
        console.log(`  ${s.name} (${s.id})`);
      }
      process.exit(1);
    }

    console.log(`http://localhost:${DAEMON_PORT}/viewer.html?s=${session.id}`);
  },
};

export default viewerBuiltin;
