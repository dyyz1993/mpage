/**
 * Lifecycle hooks for session management.
 *
 * Downstream projects register hooks to inject domain-specific behavior
 * (e.g. browser cleanup, network teardown) into the standard session lifecycle.
 *
 * All hooks are optional — the base {@link SessionManager} calls them only when registered.
 *
 * @typeParam TMeta - Session metadata type.
 */
export interface SessionLifecycle<TMeta> {
  /** Called after a session is created and stored. */
  onCreate?(session: TMeta): void | Promise<void>;

  /** Called before a session is removed from the store. */
  onClose?(session: TMeta): void | Promise<void>;

  /** Called when a session is restored from persistence. */
  onRestore?(session: TMeta): void | Promise<void>;
}
