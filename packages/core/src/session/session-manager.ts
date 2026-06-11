import type { SessionMeta } from './session-meta.js';
import type { SessionManagerContract } from './session-manager-interface.js';
import type { SessionPersistence } from './session-persistence.js';
import type { SessionLifecycle } from './session-lifecycle.js';
import { SessionStore } from './session-store.js';

/**
 * Enhanced session manager with lifecycle hooks, pluggable persistence,
 * and session recovery support.
 *
 * **Extensible**: downstream projects subclass and override template methods
 * (`allocateSession`, `restoreSession`) to inject domain-specific behavior
 * (e.g. Playwright browser launch, CDP page matching).
 *
 * @typeParam TMeta - Session metadata type. Defaults to {@link SessionMeta}.
 */
export class SessionManager<
  TMeta extends { id: string; name: string } = SessionMeta,
> implements SessionManagerContract<TMeta> {
  protected store: SessionStore<TMeta>;
  protected persistence?: SessionPersistence<TMeta>;
  protected lifecycle?: SessionLifecycle<TMeta>;

  constructor() {
    this.store = new SessionStore<TMeta>();
  }

  // ---------------------------------------------------------------------------
  // Configuration (opt-in)
  // ---------------------------------------------------------------------------

  /** Register a persistence adapter for disk-based session recovery. */
  setPersistence(adapter: SessionPersistence<TMeta>): this {
    this.persistence = adapter;
    return this;
  }

  /** Register lifecycle hooks for session events. */
  setLifecycle(hooks: SessionLifecycle<TMeta>): this {
    this.lifecycle = hooks;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Core CRUD (implements SessionManagerContract)
  // ---------------------------------------------------------------------------

  /**
   * Create a new session.
   *
   * Flow: validate uniqueness → allocate → store → persist → notify lifecycle.
   */
  async createSession(name: string, config: Record<string, unknown>): Promise<TMeta> {
    const existing = this.store.find(name);
    if (existing) {
      throw new Error(`Session '${name}' already exists`);
    }

    const session = await this.allocateSession(name, config);
    this.store.set(session);

    this.persistence?.save(name, session as Partial<TMeta>);
    await this.lifecycle?.onCreate?.(session);

    return session;
  }

  /**
   * Destroy a session by name.
   *
   * Flow: find → notify lifecycle → remove from store → unpersist.
   */
  async destroySession(name: string): Promise<TMeta | undefined> {
    const session = this.store.find(name);
    if (!session) return undefined;

    await this.lifecycle?.onClose?.(session);
    this.store.removeById(session.id);
    this.persistence?.delete(name);

    return session;
  }

  /** Get session metadata by name. */
  getSession(name: string): Promise<TMeta | undefined> {
    return Promise.resolve(this.store.find(name));
  }

  /** List all active sessions. */
  listSessions(): Promise<TMeta[]> {
    return Promise.resolve(this.store.list());
  }

  /** Clear all sessions from the store. */
  clearAll(): void {
    this.store.clear();
  }

  // ---------------------------------------------------------------------------
  // Enhanced: session recovery
  // ---------------------------------------------------------------------------

  /**
   * Find a session by name, falling back to persistence recovery.
   *
   * Flow: check memory → check persistence → restore via {@link restoreSession}.
   * Returns `undefined` if the session cannot be found or restored.
   */
  async findOrRestore(name: string): Promise<TMeta | undefined> {
    // 1. Check in-memory
    const inMem = this.store.find(name);
    if (inMem) return inMem;

    // 2. Check persistence
    if (!this.persistence) return undefined;
    const disk = this.persistence.load(name);
    if (!disk) return undefined;

    // 3. Restore
    try {
      const restored = await this.restoreSession(disk);
      this.store.set(restored);
      await this.lifecycle?.onRestore?.(restored);
      return restored;
    } catch {
      // Restore failed — clean up stale data
      this.persistence.delete(name);
      return undefined;
    }
  }

  // ---------------------------------------------------------------------------
  // Template methods (override in subclasses)
  // ---------------------------------------------------------------------------

  /**
   * Allocate a new session instance. Called by {@link createSession}.
   *
   * Default implementation generates an id and wraps name + config.
   * Override in subclasses to add domain-specific fields (e.g. browser, page).
   */
  protected allocateSession(name: string, config: Record<string, unknown>): Promise<TMeta> {
    const id = Math.random().toString(36).substring(2, 10);
    return Promise.resolve({ id, name, config } as unknown as TMeta);
  }

  /**
   * Restore a session from persisted data. Called by {@link findOrRestore}.
   *
   * Default implementation returns the disk data as-is (no reconnection).
   * Override in subclasses to re-establish connections (e.g. reconnect CDP).
   */
  protected restoreSession(disk: TMeta): Promise<TMeta> {
    return Promise.resolve(disk);
  }
}
