import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../../src/session/session-manager.js';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe('createSession()', () => {
    it('should create a session and return meta', async () => {
      const meta = await manager.createSession('s1', { url: 'http://x' });
      expect(meta.id).toBeDefined();
      expect(meta.id).toHaveLength(8);
      expect(meta.name).toBe('s1');
      expect(meta.config).toEqual({ url: 'http://x' });
    });

    it('should throw if session name already exists', async () => {
      await manager.createSession('dup', {});
      await expect(manager.createSession('dup', {})).rejects.toThrow(
        "Session 'dup' already exists"
      );
    });

    it('should allow different names', async () => {
      const a = await manager.createSession('a', {});
      const b = await manager.createSession('b', {});
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('getSession()', () => {
    it('should return session by name', async () => {
      const created = await manager.createSession('find-me', { x: 1 });
      const found = await manager.getSession('find-me');
      expect(found).toEqual(created);
    });

    it('should return undefined for non-existent name', async () => {
      expect(await manager.getSession('nope')).toBeUndefined();
    });

    it('should find correct session among multiple', async () => {
      await manager.createSession('a', {});
      const b = await manager.createSession('b', {});
      await manager.createSession('c', {});
      expect(await manager.getSession('b')).toEqual(b);
    });
  });

  describe('destroySession()', () => {
    it('should remove session and return it', async () => {
      const created = await manager.createSession('doom', { k: 'v' });
      const destroyed = await manager.destroySession('doom');
      expect(destroyed).toEqual(created);
      expect(await manager.getSession('doom')).toBeUndefined();
    });

    it('should return undefined for non-existent session', async () => {
      expect(await manager.destroySession('ghost')).toBeUndefined();
    });
  });

  describe('listSessions()', () => {
    it('should return empty when no sessions', async () => {
      expect(await manager.listSessions()).toEqual([]);
    });

    it('should return all created sessions', async () => {
      await manager.createSession('a', {});
      await manager.createSession('b', {});
      const list = await manager.listSessions();
      expect(list).toHaveLength(2);
      const names = list.map((s) => s.name);
      expect(names).toContain('a');
      expect(names).toContain('b');
    });
  });

  describe('clearAll()', () => {
    it('should remove all sessions', async () => {
      await manager.createSession('a', {});
      await manager.createSession('b', {});
      manager.clearAll();
      expect(await manager.listSessions()).toEqual([]);
    });

    it('should be safe on empty store', () => {
      manager.clearAll();
    });
  });
});
