import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { SessionInfo } from '../../src/types.js';
import {
  saveSessionInfo,
  loadSessionInfo,
  deleteSessionInfo,
  getSocketPath,
  isProcessRunning,
  listSessions,
} from '../../src/session/storage.js';

const testPrefix = 'sm-test-';
const sessionsDir = path.join(os.tmpdir(), 'mpage', 'sessions');

function cleanupTestSessions() {
  if (!fs.existsSync(sessionsDir)) return;
  for (const dir of fs.readdirSync(sessionsDir)) {
    if (dir.startsWith(testPrefix)) {
      fs.rmSync(path.join(sessionsDir, dir), { recursive: true, force: true });
    }
  }
}

function makeSessionInfo(name: string, overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    name,
    serverPid: process.pid,
    cdpEndpoint: '',
    pid: process.pid,
    socketPath: getSocketPath(name),
    isCDP: false,
    createdAt: Date.now(),
    lastUsed: Date.now(),
    ...overrides,
  };
}

describe('session-manager (storage layer)', () => {
  beforeEach(() => {
    cleanupTestSessions();
  });

  afterEach(() => {
    cleanupTestSessions();
  });

  describe('saveSessionInfo / loadSessionInfo', () => {
    it('should save and load session info', () => {
      const name = `${testPrefix}save-load`;
      const info = makeSessionInfo(name);
      saveSessionInfo(info);

      const loaded = loadSessionInfo(name);
      expect(loaded).toBeTruthy();
      expect(loaded!.name).toBe(name);
      expect(loaded!.serverPid).toBe(process.pid);
    });

    it('should return null for non-existent session', () => {
      const loaded = loadSessionInfo(`${testPrefix}nonexistent`);
      expect(loaded).toBeNull();
    });
  });

  describe('deleteSessionInfo', () => {
    it('should delete session info', async () => {
      const name = `${testPrefix}delete`;
      saveSessionInfo(makeSessionInfo(name));
      expect(loadSessionInfo(name)).toBeTruthy();

      await deleteSessionInfo(name);
      expect(loadSessionInfo(name)).toBeNull();
    });

    it('should not throw when deleting non-existent session', async () => {
      await deleteSessionInfo(`${testPrefix}nonexistent`);
    });
  });

  describe('getSocketPath', () => {
    it('should return consistent socket path', () => {
      const name = `${testPrefix}socket`;
      const socketPath = getSocketPath(name);
      expect(socketPath.includes(name)).toBeTruthy();
      expect(socketPath.includes('socket')).toBeTruthy();
    });

    it('should return same path for same name', () => {
      const name = `${testPrefix}consistent`;
      const path1 = getSocketPath(name);
      const path2 = getSocketPath(name);
      expect(path1).toBe(path2);
    });
  });

  describe('isProcessRunning', () => {
    it('should return true for current process', () => {
      expect(isProcessRunning(process.pid)).toBe(true);
    });

    it('should return false for non-existent PID', () => {
      expect(isProcessRunning(99999999)).toBe(false);
    });
  });

  describe('listSessions', () => {
    it('should list saved sessions', () => {
      const name1 = `${testPrefix}list-1`;
      const name2 = `${testPrefix}list-2`;
      saveSessionInfo(makeSessionInfo(name1));
      saveSessionInfo(makeSessionInfo(name2));

      const sessions = listSessions();
      const testSessions = sessions.filter((s) => s.name.startsWith(testPrefix));
      expect(testSessions.length >= 2).toBeTruthy();
      const names = testSessions.map((s) => s.name);
      expect(names.includes(name1)).toBeTruthy();
      expect(names.includes(name2)).toBeTruthy();
    });
  });

  describe('getOrCreateSession integration', () => {
    it('should return existing session when process is running', async () => {
      const name = `${testPrefix}existing`;
      const info = makeSessionInfo(name);
      saveSessionInfo(info);

      const { getOrCreateSession } = await import('../../src/client/session-manager.js');
      const result = await getOrCreateSession('/nonexistent/path.ts', name);

      expect(result).toBeTruthy();
      expect(result!.info.name).toBe(name);
      expect(result!.info.serverPid).toBe(process.pid);
    }, 30000);

    it('should return null for new session when server cannot start', async () => {
      const name = `${testPrefix}new-fail`;
      const { getOrCreateSession } = await import('../../src/client/session-manager.js');
      const result = await getOrCreateSession('/nonexistent/path.ts', name);

      expect(result).toBeNull();
    }, 30000);

    it('should clean up stale session and fail to start', async () => {
      const name = `${testPrefix}stale`;
      const staleInfo = makeSessionInfo(name, {
        serverPid: 99999999,
        pid: 99999999,
      });
      saveSessionInfo(staleInfo);
      expect(loadSessionInfo(name)).toBeTruthy();

      const { getOrCreateSession } = await import('../../src/client/session-manager.js');
      const result = await getOrCreateSession('/nonexistent/path.ts', name);

      expect(result).toBeNull();
    }, 30000);

    it('should return existing CDP session when same endpoint', async () => {
      const name = `${testPrefix}cdp-same`;
      const info = makeSessionInfo(name, {
        isCDP: true,
        cdpEndpoint: 'http://localhost:9222',
      });
      saveSessionInfo(info);

      const { getOrCreateSession } = await import('../../src/client/session-manager.js');
      const result = await getOrCreateSession('/path.ts', name, 'http://localhost:9222');

      expect(result).toBeTruthy();
      expect(result!.info.cdpEndpoint).toBe('http://localhost:9222');
    }, 30000);
  });
});
