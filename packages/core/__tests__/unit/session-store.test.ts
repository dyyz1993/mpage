import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSessionMeta,
  getSession,
  removeSession,
  listSessions,
  findSession,
  clearAll,
  sessions,
} from '../../src/session/session-store.js';

describe('session-store', () => {
  beforeEach(() => {
    clearAll();
  });

  describe('createSessionMeta()', () => {
    it('should create a session with auto-generated id', () => {
      const meta = createSessionMeta('test', { key: 'val' });
      expect(meta.id).toBeDefined();
      expect(meta.id).toHaveLength(8);
      expect(meta.name).toBe('test');
      expect(meta.config).toEqual({ key: 'val' });
    });

    it('should create a session with custom id', () => {
      const meta = createSessionMeta('test', {}, 'custom-id');
      expect(meta.id).toBe('custom-id');
    });

    it('should store the session in the map', () => {
      const meta = createSessionMeta('stored', { port: 3000 });
      expect(sessions.has(meta.id)).toBe(true);
      expect(sessions.get(meta.id)).toBe(meta);
    });

    it('should generate unique ids for multiple sessions', () => {
      const a = createSessionMeta('a', {});
      const b = createSessionMeta('b', {});
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('getSession()', () => {
    it('should return session by id', () => {
      const meta = createSessionMeta('get-test', { x: 1 });
      expect(getSession(meta.id)).toEqual(meta);
    });

    it('should return undefined for non-existent id', () => {
      expect(getSession('nonexistent')).toBeUndefined();
    });
  });

  describe('removeSession()', () => {
    it('should remove session by name and return it', () => {
      const meta = createSessionMeta('removable', {});
      const removed = removeSession('removable');
      expect(removed).toEqual(meta);
      expect(sessions.has(meta.id)).toBe(false);
    });

    it('should return undefined when removing non-existent session', () => {
      expect(removeSession('ghost')).toBeUndefined();
    });

    it('should only remove the matching session, not others', () => {
      const keep = createSessionMeta('keep', {});
      createSessionMeta('remove-me', {});
      removeSession('remove-me');
      expect(sessions.has(keep.id)).toBe(true);
    });
  });

  describe('listSessions()', () => {
    it('should return empty array when no sessions', () => {
      expect(listSessions()).toEqual([]);
    });

    it('should return all sessions', () => {
      createSessionMeta('a', {});
      createSessionMeta('b', {});
      const list = listSessions();
      expect(list).toHaveLength(2);
      const names = list.map((s) => s.name);
      expect(names).toContain('a');
      expect(names).toContain('b');
    });
  });

  describe('findSession()', () => {
    it('should find session by name', () => {
      const meta = createSessionMeta('target', { url: 'http://x' });
      expect(findSession('target')).toEqual(meta);
    });

    it('should return undefined when name not found', () => {
      expect(findSession('missing')).toBeUndefined();
    });

    it('should find the correct session among multiple', () => {
      createSessionMeta('first', {});
      const second = createSessionMeta('second', {});
      createSessionMeta('third', {});
      expect(findSession('second')).toEqual(second);
    });
  });

  describe('clearAll()', () => {
    it('should remove all sessions', () => {
      createSessionMeta('a', {});
      createSessionMeta('b', {});
      clearAll();
      expect(sessions.size).toBe(0);
      expect(listSessions()).toEqual([]);
    });

    it('should be safe to call on empty store', () => {
      clearAll();
      expect(sessions.size).toBe(0);
    });
  });

  describe('sessions Map', () => {
    it('should be directly accessible', () => {
      expect(sessions).toBeInstanceOf(Map);
    });

    it('should reflect createSessionMeta changes', () => {
      const meta = createSessionMeta('direct', {});
      expect(sessions.get(meta.id)).toBe(meta);
    });
  });
});
