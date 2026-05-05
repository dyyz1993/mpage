import type { SessionMeta } from './session-meta.js';
import {
  createSessionMeta,
  removeSession,
  listSessions as listSessionsFromStore,
  clearAll,
} from './session-store.js';

export class SessionManager {
  createSession(name: string, config: Record<string, unknown>): SessionMeta {
    const existing = listSessionsFromStore().find((s) => s.name === name);
    if (existing) {
      throw new Error(`Session '${name}' already exists`);
    }
    return createSessionMeta(name, config);
  }

  destroySession(name: string): SessionMeta | undefined {
    return removeSession(name);
  }

  getSession(name: string): SessionMeta | undefined {
    return listSessionsFromStore().find((s) => s.name === name);
  }

  listSessions(): SessionMeta[] {
    return listSessionsFromStore();
  }

  clearAll(): void {
    clearAll();
  }
}
