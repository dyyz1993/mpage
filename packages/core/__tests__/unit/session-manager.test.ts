import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../../src/session/session-manager.js';
import { clearAll } from '../../src/session/session-store.js';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    clearAll();
    manager = new SessionManager();
  });

  describe('createSession()', () => {
    it('should create a session and return meta', () => {
      const meta = manager.createSession('s1', { url: 'http://x' });
      expect(meta.id).toBeDefined();
      expect(meta.id).toHaveLength(8);
      expect(meta.name).toBe('s1');
      expect(meta.config).toEqual({ url: 'http://x' });
    });

    it('should throw if session name already exists', () => {
      manager.createSession('dup', {});
      expect(() => manager.createSession('dup', {})).toThrow("Session 'dup' already exists");
    });

    it('should allow different names', () => {
      const a = manager.createSession('a', {});
      const b = manager.createSession('b', {});
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('getSession()', () => {
    it('should return session by name', () => {
      const created = manager.createSession('find-me', { x: 1 });
      const found = manager.getSession('find-me');
      expect(found).toEqual(created);
    });

    it('should return undefined for non-existent name', () => {
      expect(manager.getSession('nope')).toBeUndefined();
    });

    it('should find correct session among multiple', () => {
      manager.createSession('a', {});
      const b = manager.createSession('b', {});
      manager.createSession('c', {});
      expect(manager.getSession('b')).toEqual(b);
    });
  });

  describe('destroySession()', () => {
    it('should remove session and return it', () => {
      const created = manager.createSession('doom', { k: 'v' });
      const destroyed = manager.destroySession('doom');
      expect(destroyed).toEqual(created);
      expect(manager.getSession('doom')).toBeUndefined();
    });

    it('should return undefined for non-existent session', () => {
      expect(manager.destroySession('ghost')).toBeUndefined();
    });
  });

  describe('listSessions()', () => {
    it('should return empty when no sessions', () => {
      expect(manager.listSessions()).toEqual([]);
    });

    it('should return all created sessions', () => {
      manager.createSession('a', {});
      manager.createSession('b', {});
      const list = manager.listSessions();
      expect(list).toHaveLength(2);
      const names = list.map((s) => s.name);
      expect(names).toContain('a');
      expect(names).toContain('b');
    });
  });

  describe('clearAll()', () => {
    it('should remove all sessions', () => {
      manager.createSession('a', {});
      manager.createSession('b', {});
      manager.clearAll();
      expect(manager.listSessions()).toEqual([]);
    });

    it('should be safe on empty store', () => {
      manager.clearAll();
      expect(manager.listSessions()).toEqual([]);
    });
  });
});
