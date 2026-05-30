import { randomBytes } from 'crypto';
import type { SessionMeta } from './session-meta.js';

function generateSessionId(): string {
  return randomBytes(4).toString('hex');
}

const sessions = new Map<string, SessionMeta>();

export function findSession(name: string): SessionMeta | undefined {
  for (const [, session] of sessions) {
    if (session.name === name) return session;
  }
  return undefined;
}

export function createSessionMeta(
  sessionName: string,
  config: Record<string, unknown>,
  id?: string
): SessionMeta {
  if (findSession(sessionName)) {
    throw new Error(`Session '${sessionName}' already exists`);
  }
  const sessionId = id || generateSessionId();
  const meta: SessionMeta = { id: sessionId, name: sessionName, config };
  sessions.set(sessionId, meta);
  return meta;
}

export function removeSession(name: string): SessionMeta | undefined {
  for (const [id, session] of sessions) {
    if (session.name === name) {
      sessions.delete(id);
      return session;
    }
  }
  return undefined;
}

export function getSession(id: string): SessionMeta | undefined {
  return sessions.get(id);
}

export function clearAll(): void {
  sessions.clear();
}

export function listSessions(): Array<SessionMeta> {
  return Array.from(sessions.values());
}

export { sessions };
