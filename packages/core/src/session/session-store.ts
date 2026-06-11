import { randomBytes } from 'crypto';
import type { SessionMeta } from './session-meta.js';

function generateSessionId(): string {
  return randomBytes(4).toString('hex');
}

/**
 * Generic in-memory session store.
 *
 * @typeParam TMeta - Session metadata type. Must contain at least `id` and `name`.
 */
export class SessionStore<TMeta extends { id: string; name: string }> {
  private readonly map = new Map<string, TMeta>();

  /** Find a session by name. */
  find(name: string): TMeta | undefined {
    for (const [, session] of this.map) {
      if (session.name === name) return session;
    }
    return undefined;
  }

  /** Get a session by id. */
  get(id: string): TMeta | undefined {
    return this.map.get(id);
  }

  /** Add a session to the store. Throws if the name already exists. */
  add(session: TMeta): TMeta {
    if (this.find(session.name)) {
      throw new Error(`Session '${session.name}' already exists`);
    }
    this.map.set(session.id, session);
    return session;
  }

  /**
   * Set (upsert) a session by id — no duplicate-name check.
   * Use for restoring or replacing sessions where uniqueness is already guaranteed.
   */
  set(session: TMeta): void {
    this.map.set(session.id, session);
  }

  /** Remove a session by name and return it. */
  remove(name: string): TMeta | undefined {
    for (const [id, session] of this.map) {
      if (session.name === name) {
        this.map.delete(id);
        return session;
      }
    }
    return undefined;
  }

  /** Remove a session by id and return it. */
  removeById(id: string): TMeta | undefined {
    const session = this.map.get(id);
    if (session) {
      this.map.delete(id);
    }
    return session;
  }

  /** List all sessions. */
  list(): Array<TMeta> {
    return Array.from(this.map.values());
  }

  /** Clear all sessions. */
  clear(): void {
    this.map.clear();
  }

  /** Number of sessions. */
  get size(): number {
    return this.map.size;
  }

  /** Raw Map access for advanced use. */
  get entries(): Map<string, TMeta> {
    return this.map;
  }

  /** Iterate over sessions. */
  [Symbol.iterator](): IterableIterator<TMeta> {
    return this.map.values()[Symbol.iterator]() as IterableIterator<TMeta>;
  }
}

// ---------------------------------------------------------------------------
// Default singleton store for core's SessionMeta (backward compat)
// ---------------------------------------------------------------------------

const defaultStore = new SessionStore<SessionMeta>();

export { defaultStore as sessions };

export function findSession(name: string): SessionMeta | undefined {
  return defaultStore.find(name);
}

export function createSessionMeta(
  sessionName: string,
  config: Record<string, unknown>,
  id?: string
): SessionMeta {
  const sessionId = id || generateSessionId();
  const meta: SessionMeta = { id: sessionId, name: sessionName, config };
  return defaultStore.add(meta);
}

export function removeSession(name: string): SessionMeta | undefined {
  return defaultStore.remove(name);
}

export function getSession(id: string): SessionMeta | undefined {
  return defaultStore.get(id);
}

export function clearAll(): void {
  defaultStore.clear();
}

export function listSessions(): Array<SessionMeta> {
  return defaultStore.list();
}
