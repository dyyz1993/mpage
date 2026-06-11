/**
 * Generic session manager contract.
 *
 * Core provides a simple in-memory implementation ({@link SessionManager}),
 * but downstream projects (e.g. xbrowser) can implement this contract with
 * their own session metadata type that carries domain-specific state such as
 * Playwright `Page` instances or WebSocket connections.
 *
 * @typeParam TMeta - The session metadata type. Must at minimum contain `id`
 *   and `name` fields.
 */
export interface SessionManagerContract<
  TMeta extends { id: string; name: string } = { id: string; name: string },
> {
  /**
   * Create a new session.
   *
   * @param name - Unique name for the session.
   * @param config - Implementation-specific configuration.
   * @returns The created session metadata.
   */
  createSession(name: string, config: Record<string, unknown>): TMeta | Promise<TMeta>;

  /**
   * Destroy a session by name.
   *
   * @param name - The session name to destroy.
   * @returns The destroyed session metadata, or `undefined` if not found.
   */
  destroySession(name: string): TMeta | undefined | Promise<TMeta | undefined>;

  /**
   * Get session metadata by name.
   *
   * @param name - The session name.
   * @returns The session metadata, or `undefined` if not found.
   */
  getSession(name: string): TMeta | undefined | Promise<TMeta | undefined>;

  /**
   * List all active sessions.
   *
   * @returns Array of session metadata.
   */
  listSessions(): TMeta[] | Promise<TMeta[]>;
}
