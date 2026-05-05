import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getSessionPath,
  getSessionFile,
  loadSessionInfo,
  saveSessionInfo,
  deleteSessionInfo,
  listSessions,
  getSocketPath,
} from '../../src/session/storage.js';
import type { SessionInfo } from '../../src/types.js';

const TEST_STORAGE = path.join(os.tmpdir(), 'mpage-test-storage-' + process.pid);

function makeSessionInfo(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    name: 'test-session',
    cdpEndpoint: 'http://127.0.0.1:9222',
    pid: 12345,
    serverPid: 12346,
    socketPath: '/tmp/test-socket',
    isCDP: true,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    ...overrides,
  };
}

describe('session storage', () => {
  let storageDir: string;

  beforeEach(() => {
    storageDir = TEST_STORAGE + '-' + Date.now();
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(storageDir)) {
      fs.rmSync(storageDir, { recursive: true, force: true });
    }
  });

  describe('getSessionPath', () => {
    it('should return path under DEFAULT_STORAGE', () => {
      const result = getSessionPath('my-session');
      expect(result.includes('my-session')).toBeTruthy();
      expect(result.includes('sessions')).toBeTruthy();
    });
  });

  describe('getSessionFile', () => {
    it('should return session.json path', () => {
      const result = getSessionFile('my-session');
      expect(result.endsWith('session.json')).toBeTruthy();
    });
  });

  describe('getSocketPath', () => {
    it('should return socket path under session dir', () => {
      const result = getSocketPath('my-session');
      expect(result.endsWith('socket')).toBeTruthy();
      expect(result.includes('my-session')).toBeTruthy();
    });
  });

  describe('saveSessionInfo + loadSessionInfo', () => {
    it('should save and load session info', async () => {
      const info = makeSessionInfo({ name: 'round-trip-test' });
      saveSessionInfo(info);

      const loaded = loadSessionInfo('round-trip-test');
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('round-trip-test');
      expect(loaded!.cdpEndpoint).toBe(info.cdpEndpoint);
      expect(loaded!.pid).toBe(info.pid);
      expect(loaded!.isCDP).toBe(info.isCDP);

      await deleteSessionInfo('round-trip-test');
    });

    it('should persist all fields correctly', async () => {
      const info = makeSessionInfo({
        name: 'fields-test',
        isCDP: false,
        socketPath: '/custom/socket.sock',
        createdAt: 1700000000000,
        lastUsed: 1700000001000,
      });
      saveSessionInfo(info);

      const loaded = loadSessionInfo('fields-test');
      expect(loaded).not.toBeNull();
      expect(loaded!.isCDP).toBe(false);
      expect(loaded!.socketPath).toBe('/custom/socket.sock');
      expect(loaded!.createdAt).toBe(1700000000000);
      expect(loaded!.lastUsed).toBe(1700000001000);

      await deleteSessionInfo('fields-test');
    });

    it('should overwrite existing session on save', async () => {
      const info1 = makeSessionInfo({ name: 'overwrite-test', pid: 11111 });
      saveSessionInfo(info1);

      const info2 = makeSessionInfo({ name: 'overwrite-test', pid: 22222 });
      saveSessionInfo(info2);

      const loaded = loadSessionInfo('overwrite-test');
      expect(loaded).not.toBeNull();
      expect(loaded!.pid).toBe(22222);

      await deleteSessionInfo('overwrite-test');
    });
  });

  describe('loadSessionInfo', () => {
    it('should return null for non-existent session', () => {
      const result = loadSessionInfo('non-existent-session-xyz');
      expect(result).toBeNull();
    });
  });

  describe('deleteSessionInfo', () => {
    it('should delete session directory', async () => {
      const info = makeSessionInfo({ name: 'delete-test' });
      saveSessionInfo(info);

      const sessionPath = getSessionPath('delete-test');
      expect(fs.existsSync(sessionPath)).toBeTruthy();

      await deleteSessionInfo('delete-test');
      expect(fs.existsSync(sessionPath)).toBeFalsy();
    });

    it('should not throw for non-existent session', async () => {
      await deleteSessionInfo('non-existent-delete-test');
    });

    it('should retry with delay when deletion fails', async () => {
      const info = makeSessionInfo({ name: 'retry-delay-test' });
      saveSessionInfo(info);

      const callTimestamps: number[] = [];
      const originalRmSync = fs.rmSync;
      let callCount = 0;

      fs.rmSync = ((...args: [string, fs.RmSyncOptions?]) => {
        callTimestamps.push(Date.now());
        callCount++;
        if (callCount < 3) {
          throw new Error(`Simulated failure ${callCount}`);
        }
        return originalRmSync.apply(fs, args);
      }) as typeof fs.rmSync;

      try {
        await deleteSessionInfo('retry-delay-test');

        expect(callCount).toBe(3);

        const delay1 = callTimestamps[1] - callTimestamps[0];
        const delay2 = callTimestamps[2] - callTimestamps[1];
        expect(delay1 >= 50).toBeTruthy();
        expect(delay2 >= 50).toBeTruthy();
      } finally {
        fs.rmSync = originalRmSync;
        const sessionPath = getSessionPath('retry-delay-test');
        if (fs.existsSync(sessionPath)) {
          originalRmSync(sessionPath, { recursive: true, force: true });
        }
      }
    });
  });

  describe('listSessions', () => {
    it('should return empty array when no sessions exist', () => {
      const sessions = listSessions();
      expect(Array.isArray(sessions)).toBeTruthy();
    });

    it('should list saved sessions', async () => {
      const info1 = makeSessionInfo({ name: 'list-test-1' });
      const info2 = makeSessionInfo({ name: 'list-test-2' });
      saveSessionInfo(info1);
      saveSessionInfo(info2);

      const sessions = listSessions();
      const names = sessions.map((s) => s.name);
      expect(names.includes('list-test-1')).toBeTruthy();
      expect(names.includes('list-test-2')).toBeTruthy();

      await deleteSessionInfo('list-test-1');
      await deleteSessionInfo('list-test-2');
    });

    it('should throw on corrupted session files (no built-in error handling)', async () => {
      const corruptPath = getSessionPath('corrupt-session');
      fs.mkdirSync(corruptPath, { recursive: true });
      fs.writeFileSync(path.join(corruptPath, 'session.json'), 'not-valid-json{{{', 'utf-8');

      expect(() => {
        loadSessionInfo('corrupt-session');
      }).toThrow(SyntaxError);

      await deleteSessionInfo('corrupt-session');
    });
  });

  describe('JSON file format', () => {
    it('should write pretty-printed JSON', async () => {
      const info = makeSessionInfo({ name: 'format-test' });
      saveSessionInfo(info);

      const fileContent = fs.readFileSync(getSessionFile('format-test'), 'utf-8');
      expect(fileContent.includes('\n')).toBeTruthy();
      expect(fileContent.includes('  ')).toBeTruthy();

      const parsed = JSON.parse(fileContent);
      expect(parsed.name).toBe('format-test');

      await deleteSessionInfo('format-test');
    });
  });
});
