import {
  type CommandValues,
  type CommandArgs,
  ok,
  fail,
  type CommandResult,
  listSessions as listMetaSessions,
  removeSession,
  createSessionMeta,
} from '@dyyz1993/xcli-core';
import {
  openSession,
  closeSession,
  listSessions as listBrowserSessions,
  daemonRequest,
} from '../session/browser-session-client.js';

export async function handleSessionOpen(
  args: CommandArgs,
  values: CommandValues
): Promise<CommandResult> {
  const name = args[0] || 'default';
  const url = values.url as string;

  if (!url) {
    return fail('Missing required option: --url <url>', [
      'Usage: xcli-browser session open <name> --url <url>',
    ]);
  }

  try {
    const session = await openSession(name, url);
    return ok({ id: session.id, name: session.name, url: session.url }, [
      `Session '${name}' opened`,
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(msg, ['Make sure the daemon is running: xcli-browser daemon']);
  }
}

export async function handleSessionClose(
  args: CommandArgs,
  _values: CommandValues
): Promise<CommandResult> {
  const name = args[0];
  if (!name) {
    return fail('Missing session name', ['Usage: xcli-browser session close <name>']);
  }

  try {
    await closeSession(name);
    removeSession(name);
    return ok(null, [`Session '${name}' closed`]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(msg);
  }
}

export async function handleSessionList(
  _args: CommandArgs,
  _values: CommandValues
): Promise<CommandResult> {
  const metaSessions = listMetaSessions();
  const browserSessions = await listBrowserSessions();

  const combined = metaSessions.map((meta) => {
    const browserSession = browserSessions.find((bs) => bs.name === meta.name);
    return {
      name: meta.name,
      id: meta.id,
      active: !!browserSession,
    };
  });

  if (combined.length === 0) {
    return ok(
      [],
      ['No sessions. Use "xcli-browser session open <name> --url <url>" to create one.']
    );
  }

  return ok(combined);
}

export async function handleSessionKill(
  _args: CommandArgs,
  _values: CommandValues
): Promise<CommandResult> {
  try {
    await daemonRequest('session.closeAll');
    const sessions = listMetaSessions();
    for (const s of sessions) {
      removeSession(s.name);
    }
    return ok(null, [`Killed ${sessions.length} session(s)`]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(msg);
  }
}

export function handleSessionHelp(): string {
  return [
    'Usage: xcli-browser session <command>',
    '',
    'Commands:',
    '  open <name> --url <url>    Open browser session',
    '  close <name>               Close session',
    '  list                       List sessions',
    '  kill                       Kill all sessions and cleanup',
  ].join('\n');
}

export function ensureSession(name: string): void {
  const existing = listMetaSessions().find((s) => s.name === name);
  if (!existing) {
    createSessionMeta(name, { createdAt: new Date().toISOString() });
  }
}
