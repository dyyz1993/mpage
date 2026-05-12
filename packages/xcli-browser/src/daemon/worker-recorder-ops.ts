import { RecorderController, PlaybackEngine, executePageCommand } from '@dyyz1993/xpage';
import { findSession } from './worker-session-ops.js';

const RECORDER_COMMANDS = new Set(['recorder.start', 'recorder.stop', 'recorder.status']);

const REPLAY_COMMANDS = new Set(['replay.start']);

export function isRecorderCommand(method: string): boolean {
  return RECORDER_COMMANDS.has(method) || REPLAY_COMMANDS.has(method);
}

export async function handleRecorderCommand(
  method: string,
  p: Record<string, unknown>
): Promise<unknown> {
  switch (method) {
    case 'recorder.start': {
      const recSession = findSession(p.name as string);
      if (!recSession) throw new Error('Session not found');
      const recorder = new RecorderController(recSession.page);
      await recorder.start({
        url: p.url as string | undefined,
        name: p.recorderName as string | undefined,
      });
      recSession.recorder = recorder;
      return { ok: true, recordingId: recorder.id };
    }

    case 'recorder.stop': {
      const rSession = findSession(p.name as string);
      if (!rSession || !rSession.recorder) throw new Error('No active recorder for session');
      const recorderResult = await rSession.recorder.stop(p.outputPath as string | undefined);
      rSession.recorder = undefined;
      return {
        ok: true,
        path: recorderResult.path,
        eventCount: recorderResult.session.events.length,
      };
    }

    case 'recorder.status': {
      const sSession = findSession(p.name as string);
      if (!sSession || !sSession.recorder) return { ok: true, status: null };
      return { ok: true, status: sSession.recorder.getStatus() };
    }

    default:
      throw new Error(`Unknown recorder method: ${method}`);
  }
}

export async function handleReplayCommand(
  method: string,
  p: Record<string, unknown>
): Promise<unknown> {
  if (method === 'replay.start') {
    const replaySession = findSession(p.name as string);
    if (!replaySession) throw new Error('Session not found');
    const engine = await PlaybackEngine.fromFile(replaySession.page, p.filePath as string);
    const replayResult = await engine.play({ slowMo: (p.slowMo as number) || 1 });
    return { ok: true, result: replayResult };
  }
  throw new Error(`Unknown replay method: ${method}`);
}

const DIRECT_PAGE_COMMANDS: Record<string, string> = {
  'page.snapshot': 'a11y',
  'page.mouse': 'mouse',
  'page.get': 'getProperty',
  'page.navigate': '_navigate',
  'page.http': '_http',
  'page.fetch': '_http',
  'page.addCookie': 'setCookie',
};

export function isDirectPageCommand(method: string): boolean {
  return method in DIRECT_PAGE_COMMANDS;
}

export async function handleDirectPageCommand(
  method: string,
  p: Record<string, unknown>
): Promise<unknown> {
  const session = findSession(p.name as string);
  if (!session) return { ok: false, error: 'Session not found' };

  switch (method) {
    case 'page.snapshot': {
      const result = await executePageCommand(session.page, 'a11y', {
        selector: p.selector || 'body',
        format: 'yaml',
      });
      return result;
    }

    case 'page.mouse': {
      return executePageCommand(session.page, 'mouse', {
        action: p.action,
        x: p.x,
        y: p.y,
        steps: p.steps,
      });
    }

    case 'page.get': {
      const prop = p.property as string;
      if (prop === 'url') {
        return { ok: true, property: prop, selector: p.selector, value: session.page.url() };
      }
      if (prop === 'title') {
        const titleResult = await executePageCommand(session.page, 'title', {});
        return {
          ok: true,
          property: prop,
          selector: p.selector,
          value: (titleResult as Record<string, unknown>).title as string,
        };
      }
      if (p.selector) {
        if (prop === 'value') {
          const valueResult = await executePageCommand(session.page, 'inputValue', {
            selector: p.selector,
          });
          return {
            ok: true,
            property: prop,
            selector: p.selector,
            value: (valueResult as Record<string, unknown>).value as string,
          };
        }
        const textResult = await executePageCommand(session.page, 'textContent', {
          selector: p.selector,
        });
        return {
          ok: true,
          property: prop,
          selector: p.selector,
          value: (textResult as Record<string, unknown>).text as string,
        };
      }
      return { ok: true, property: prop, selector: p.selector, value: '' };
    }

    case 'page.navigate': {
      const direction = p.direction as string;
      if (direction === 'back') {
        await executePageCommand(session.page, 'goBack', {});
      } else if (direction === 'forward') {
        await executePageCommand(session.page, 'goForward', {});
      }
      return { ok: true, direction };
    }

    case 'page.http':
    case 'page.fetch': {
      const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (p.headers) Object.assign(requestHeaders, p.headers as Record<string, string>);
      const fetchOptions: RequestInit = {
        method: (p.method as string) || 'GET',
        headers: requestHeaders,
      };
      if (p.body && (p.method === 'POST' || p.method === 'PUT' || p.method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(p.body);
      }
      const response = await session.page.evaluate(
        async ({ u, opts }: { u: string; opts: RequestInit }) => {
          const res = await fetch(u, opts);
          const contentType = res.headers.get('content-type') || '';
          let data;
          if (contentType.includes('json')) {
            data = await res.json();
          } else {
            data = await res.text();
          }
          return { status: res.status, ok: res.ok, contentType, data };
        },
        { u: p.url as string, opts: fetchOptions }
      );
      return response;
    }

    case 'page.addCookie': {
      await executePageCommand(session.page, 'setCookie', p.cookie as Record<string, unknown>);
      return { ok: true, cookie: p.cookie };
    }

    default:
      throw new Error(`Unknown direct page method: ${method}`);
  }
}
