import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../../src/session/session-manager.js';
import { FileSessionPersistence } from '../../src/session/session-persistence.js';
import type { SessionLifecycle } from '../../src/session/session-lifecycle.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SessionManager — persistence', () => {
  let manager: SessionManager;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-test-'));
    manager = new SessionManager().setPersistence(new FileSessionPersistence(tmpDir));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should persist session to disk on create', async () => {
    await manager.createSession('s1', { url: 'http://x' });

    const file = path.join(tmpDir, 's1.json');
    expect(fs.existsSync(file)).toBe(true);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(data.name).toBe('s1');
    expect(data.config).toEqual({ url: 'http://x' });
  });

  it('should delete session from disk on destroy', async () => {
    await manager.createSession('s1', {});
    expect(fs.existsSync(path.join(tmpDir, 's1.json'))).toBe(true);

    await manager.destroySession('s1');
    expect(fs.existsSync(path.join(tmpDir, 's1.json'))).toBe(false);
  });

  it('should recover session from disk via findOrRestore', async () => {
    await manager.createSession('s1', { url: 'http://x' });

    // Simulate process restart: new manager, same persistence dir
    const newManager = new SessionManager().setPersistence(new FileSessionPersistence(tmpDir));

    const restored = await newManager.findOrRestore('s1');
    expect(restored).toBeDefined();
    expect(restored!.name).toBe('s1');
    expect(restored!.config).toEqual({ url: 'http://x' });
  });

  it('should return undefined when no persistence set', async () => {
    const noPersistManager = new SessionManager();
    const result = await noPersistManager.findOrRestore('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should return undefined when session not on disk', async () => {
    const result = await manager.findOrRestore('ghost');
    expect(result).toBeUndefined();
  });

  it('should find in-memory session before checking disk', async () => {
    await manager.createSession('s1', { url: 'http://x' });

    // findOrRestore should return in-memory session directly
    const found = await manager.findOrRestore('s1');
    expect(found).toBeDefined();
    expect(found!.name).toBe('s1');
  });

  it('should clean up stale disk data if restore fails', async () => {
    // Write valid JSON that can be loaded but will fail during restore
    fs.writeFileSync(
      path.join(tmpDir, 'bad.json'),
      JSON.stringify({ id: 'x', name: 'bad', config: {} })
    );

    // Manager with a restore that throws
    class FailRestoreManager extends SessionManager {
      protected override async restoreSession() {
        throw new Error('restore failed');
      }
    }
    const failManager = new FailRestoreManager().setPersistence(new FileSessionPersistence(tmpDir));

    const result = await failManager.findOrRestore('bad');
    expect(result).toBeUndefined();
    // Stale file should be cleaned up
    expect(fs.existsSync(path.join(tmpDir, 'bad.json'))).toBe(false);
  });
});

describe('SessionManager — lifecycle hooks', () => {
  let manager: SessionManager;
  const events: string[] = [];

  beforeEach(() => {
    events.length = 0;
    manager = new SessionManager().setLifecycle({
      onCreate: async () => {
        events.push('create');
      },
      onClose: async () => {
        events.push('close');
      },
      onRestore: async () => {
        events.push('restore');
      },
    } satisfies SessionLifecycle<{ id: string; name: string; config: Record<string, unknown> }>);
  });

  it('should call onCreate after creating a session', async () => {
    await manager.createSession('s1', {});
    expect(events).toEqual(['create']);
  });

  it('should call onClose after destroying a session', async () => {
    await manager.createSession('s1', {});
    await manager.destroySession('s1');
    expect(events).toEqual(['create', 'close']);
  });

  it('should not call onClose for non-existent session', async () => {
    await manager.destroySession('ghost');
    expect(events).toEqual([]);
  });

  it('should call onRestore after findOrRestore recovers from disk', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-test-'));
    const restoreEvents: string[] = [];
    try {
      // Create and persist with first manager
      const createManager = new SessionManager().setPersistence(new FileSessionPersistence(tmpDir));
      await createManager.createSession('s1', {});

      // New manager with same persistence, restore hook only
      const newManager = new SessionManager()
        .setPersistence(new FileSessionPersistence(tmpDir))
        .setLifecycle({
          onRestore: async () => {
            restoreEvents.push('restore');
          },
        } satisfies SessionLifecycle<{
          id: string;
          name: string;
          config: Record<string, unknown>;
        }>);

      await newManager.findOrRestore('s1');
      expect(restoreEvents).toEqual(['restore']);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('SessionManager — subclassing', () => {
  it('should use custom allocateSession', async () => {
    class CustomManager extends SessionManager {
      protected override async allocateSession(name: string, config: Record<string, unknown>) {
        return {
          id: 'custom-id',
          name,
          config,
          extra: 'from-subclass',
        } as Awaited<ReturnType<SessionManager['allocateSession']>>;
      }
    }

    const manager = new CustomManager();
    const session = await manager.createSession('s1', { x: 1 });
    expect(session.id).toBe('custom-id');
    expect((session as Record<string, unknown>).extra).toBe('from-subclass');
  });

  it('should use custom restoreSession', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'session-test-'));
    try {
      class RestoreManager extends SessionManager {
        protected override async restoreSession(disk: Record<string, unknown>) {
          return { ...disk, restored: true } as Awaited<
            ReturnType<SessionManager['restoreSession']>
          >;
        }
      }

      // Create and persist
      const createManager = new SessionManager().setPersistence(new FileSessionPersistence(tmpDir));
      await createManager.createSession('s1', { url: 'http://x' });

      // Restore with custom logic
      const restoreManager = new RestoreManager().setPersistence(
        new FileSessionPersistence(tmpDir)
      );
      const restored = await restoreManager.findOrRestore('s1');
      expect(restored).toBeDefined();
      expect((restored as Record<string, unknown>).restored).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
