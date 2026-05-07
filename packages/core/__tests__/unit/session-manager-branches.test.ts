import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../../src/session/session-manager.js';
import { clearAll } from '../../src/session/session-store.js';

describe('SessionManager — branch coverage', () => {
  let manager: SessionManager;

  beforeEach(() => {
    clearAll();
    manager = new SessionManager();
  });

  describe('createSession — duplicate name branch', () => {
    it('should throw error with correct message for duplicate name', () => {
      manager.createSession('dup-test', {});
      try {
        manager.createSession('dup-test', { url: 'http://other' });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toBe("Session 'dup-test' already exists");
      }
    });
  });

  describe('getSession — not found branch', () => {
    it('should return undefined when no sessions exist', () => {
      expect(manager.getSession('nonexistent')).toBeUndefined();
    });

    it('should return undefined when other sessions exist but not requested one', () => {
      manager.createSession('exists', { url: 'http://x' });
      expect(manager.getSession('other')).toBeUndefined();
    });
  });

  describe('destroySession — return removed session', () => {
    it('should return the removed session meta', () => {
      const created = manager.createSession('remove-me', { data: 42 });
      const removed = manager.destroySession('remove-me');
      expect(removed).toBeDefined();
      expect(removed!.name).toBe('remove-me');
      expect(removed!.config).toEqual({ data: 42 });
    });

    it('should return undefined when removing non-existent session', () => {
      expect(manager.destroySession('ghost')).toBeUndefined();
    });
  });

  describe('listSessions — empty and populated', () => {
    it('should return empty array when no sessions', () => {
      expect(manager.listSessions()).toEqual([]);
    });

    it('should preserve session order', () => {
      manager.createSession('first', {});
      manager.createSession('second', {});
      manager.createSession('third', {});
      const list = manager.listSessions();
      expect(list.map((s) => s.name)).toEqual(['first', 'second', 'third']);
    });
  });

  describe('clearAll — idempotent', () => {
    it('should handle multiple clearAll calls', () => {
      manager.createSession('a', {});
      manager.clearAll();
      manager.clearAll();
      expect(manager.listSessions()).toEqual([]);
    });
  });

  describe('createSession — config preservation', () => {
    it('should preserve complex config objects', () => {
      const config = {
        url: 'https://example.com',
        headers: { 'Content-Type': 'application/json' },
        retry: { attempts: 3, delay: 1000 },
      };
      const meta = manager.createSession('complex', config);
      expect(meta.config).toEqual(config);
    });
  });
});
