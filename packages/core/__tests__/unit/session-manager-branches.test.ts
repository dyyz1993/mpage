import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../../src/session/session-manager.js';

describe('SessionManager — branch coverage', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe('createSession — duplicate name branch', () => {
    it('should throw error with correct message for duplicate name', async () => {
      await manager.createSession('dup-test', {});
      try {
        await manager.createSession('dup-test', { url: 'http://other' });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toBe("Session 'dup-test' already exists");
      }
    });
  });

  describe('getSession — not found branch', () => {
    it('should return undefined when no sessions exist', async () => {
      expect(await manager.getSession('nonexistent')).toBeUndefined();
    });

    it('should return undefined when other sessions exist but not requested one', async () => {
      await manager.createSession('exists', { url: 'http://x' });
      expect(await manager.getSession('other')).toBeUndefined();
    });
  });

  describe('destroySession — return removed session', () => {
    it('should return the removed session meta', async () => {
      await manager.createSession('remove-me', { data: 42 });
      const removed = await manager.destroySession('remove-me');
      expect(removed).toBeDefined();
      expect(removed!.name).toBe('remove-me');
      expect(removed!.config).toEqual({ data: 42 });
    });

    it('should return undefined when removing non-existent session', async () => {
      expect(await manager.destroySession('ghost')).toBeUndefined();
    });
  });

  describe('listSessions — empty and populated', () => {
    it('should return empty array when no sessions', async () => {
      expect(await manager.listSessions()).toEqual([]);
    });

    it('should preserve session order', async () => {
      await manager.createSession('first', {});
      await manager.createSession('second', {});
      await manager.createSession('third', {});
      const list = await manager.listSessions();
      expect(list.map((s) => s.name)).toEqual(['first', 'second', 'third']);
    });
  });

  describe('clearAll — idempotent', () => {
    it('should handle multiple clearAll calls', async () => {
      await manager.createSession('a', {});
      manager.clearAll();
      manager.clearAll();
      expect(await manager.listSessions()).toEqual([]);
    });
  });

  describe('createSession — config preservation', () => {
    it('should preserve complex config objects', async () => {
      const config = {
        url: 'https://example.com',
        headers: { 'Content-Type': 'application/json' },
        retry: { attempts: 3, delay: 1000 },
      };
      const meta = await manager.createSession('complex', config);
      expect(meta.config).toEqual(config);
    });
  });
});
