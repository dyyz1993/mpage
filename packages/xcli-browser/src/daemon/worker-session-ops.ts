import type { BrowserContext, Page, CDPSession } from 'playwright';
import type { RecorderController } from '@dyyz1993/xpage';
import { executePageCommand } from '@dyyz1993/xpage';

export interface WorkerSession {
  id: string;
  name: string;
  context: BrowserContext;
  page: Page;
  recorder?: RecorderController;
  screencastSessionId?: number;
}

export const sessions = new Map<string, WorkerSession>();

export async function startScreencast(session: WorkerSession): Promise<void> {
  const cdp: CDPSession = await session.context.newCDPSession(session.page);
  await cdp.send('Page.startScreencast', {
    format: 'png',
    quality: 50,
    maxWidth: 1280,
    maxHeight: 720,
  });
  cdp.on('Page.screencastFrame', async (event: { data: string; sessionId: number }) => {
    await cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId });
    if (process.send) {
      process.send({
        type: 'event',
        event: 'screencastFrame',
        sessionId: session.id,
        data: event.data,
      });
    }
  });
}

export function findSession(name: string): WorkerSession | undefined {
  for (const [, session] of sessions) {
    if (session.name === name) return session;
  }
  return undefined;
}

const SESSION_LIFECYCLE_COMMANDS = new Set([
  'session.create',
  'session.open',
  'session.close',
  'session.closeAll',
  'session.list',
]);

const STORAGE_COMMANDS = new Set(['storage.get', 'storage.set', 'storage.clear']);

export function isSessionCommand(method: string): boolean {
  return SESSION_LIFECYCLE_COMMANDS.has(method) || STORAGE_COMMANDS.has(method);
}

export async function handleSessionCommand(
  method: string,
  p: Record<string, unknown>
): Promise<unknown> {
  switch (method) {
    case 'session.create':
    case 'session.open': {
      const { getBrowser } = await import('./browser-worker.js');
      const b = await getBrowser();
      const context = await b.newContext();
      const page = await context.newPage();
      await page.goto(p.url as string);
      const session: WorkerSession = {
        id: p.sessionId as string,
        name: p.name as string,
        context,
        page,
      };
      sessions.set(session.id, session);
      startScreencast(session).catch((err: unknown) => {
        console.error('Failed to start screencast:', err);
      });
      return { id: session.id, name: session.name };
    }

    case 'session.close': {
      for (const [id, session] of sessions) {
        if (session.name === p.name) {
          await session.context.close();
          sessions.delete(id);
          return { ok: true };
        }
      }
      return { ok: true };
    }

    case 'session.closeAll': {
      for (const [, session] of sessions) {
        await session.context.close();
      }
      sessions.clear();
      return { ok: true };
    }

    case 'session.list': {
      return {
        sessions: Array.from(sessions.values()).map((s) => ({ id: s.id, name: s.name })),
      };
    }

    default:
      throw new Error(`Unknown session method: ${method}`);
  }
}

export async function handleStorageCommand(
  method: string,
  p: Record<string, unknown>
): Promise<unknown> {
  switch (method) {
    case 'storage.get': {
      const gs = findSession(p.name as string);
      if (!gs) return p.type === 'cookies' ? { cookies: [] } : { localStorage: {} };
      if (p.type === 'cookies') {
        const result = await executePageCommand(gs.page, 'getCookies', {});
        return result;
      }
      if (p.type === 'localStorage') {
        const result = await executePageCommand(gs.page, 'getLocalStorage', {});
        return { localStorage: (result as Record<string, unknown>).data };
      }
      return p.type === 'cookies' ? { cookies: [] } : { localStorage: {} };
    }

    case 'storage.set': {
      const ss = findSession(p.name as string);
      if (!ss) return { ok: true };
      if (p.type === 'cookies' && p.data) {
        await executePageCommand(ss.page, 'setCookie', p.data as Record<string, unknown>);
      } else if (p.type === 'localStorage' && p.key !== undefined) {
        await executePageCommand(ss.page, 'setLocalStorage', {
          key: p.key as string,
          value: (p.value as string) || '',
        });
      }
      return { ok: true };
    }

    case 'storage.clear': {
      const cs = findSession(p.name as string);
      if (!cs) return { ok: true };
      if (p.type === 'cookies') {
        await executePageCommand(cs.page, 'clearCookies', {});
      } else if (p.type === 'localStorage') {
        await executePageCommand(cs.page, 'clearLocalStorage', {});
      }
      return { ok: true };
    }

    default:
      throw new Error(`Unknown storage method: ${method}`);
  }
}
