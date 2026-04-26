import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
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
      assert.ok(loaded);
      assert.strictEqual(loaded.name, name);
      assert.strictEqual(loaded.serverPid, process.pid);
    });

    it('should return null for non-existent session', () => {
      const loaded = loadSessionInfo(`${testPrefix}nonexistent`);
      assert.strictEqual(loaded, null);
    });
  });

  describe('deleteSessionInfo', () => {
    it('should delete session info', () => {
      const name = `${testPrefix}delete`;
      saveSessionInfo(makeSessionInfo(name));
      assert.ok(loadSessionInfo(name));

      deleteSessionInfo(name);
      assert.strictEqual(loadSessionInfo(name), null);
    });

    it('should not throw when deleting non-existent session', () => {
      assert.doesNotThrow(() => {
        deleteSessionInfo(`${testPrefix}nonexistent`);
      });
    });
  });

  describe('getSocketPath', () => {
    it('should return consistent socket path', () => {
      const name = `${testPrefix}socket`;
      const socketPath = getSocketPath(name);
      assert.ok(socketPath.includes(name));
      assert.ok(socketPath.includes('socket'));
    });

    it('should return same path for same name', () => {
      const name = `${testPrefix}consistent`;
      const path1 = getSocketPath(name);
      const path2 = getSocketPath(name);
      assert.strictEqual(path1, path2);
    });
  });

  describe('isProcessRunning', () => {
    it('should return true for current process', () => {
      assert.strictEqual(isProcessRunning(process.pid), true);
    });

    it('should return false for non-existent PID', () => {
      assert.strictEqual(isProcessRunning(99999999), false);
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
      assert.ok(testSessions.length >= 2);
      const names = testSessions.map((s) => s.name);
      assert.ok(names.includes(name1));
      assert.ok(names.includes(name2));
    });
  });

  describe('getOrCreateSession integration', () => {
    it('should return existing session when process is running', async () => {
      const name = `${testPrefix}existing`;
      const info = makeSessionInfo(name);
      saveSessionInfo(info);

      const { getOrCreateSession } = await import('../../src/client/session-manager.js');
      const result = await getOrCreateSession('/nonexistent/path.ts', name);

      assert.ok(result);
      assert.strictEqual(result!.info.name, name);
      assert.strictEqual(result!.info.serverPid, process.pid);
    });

    it('should return null for new session when server cannot start', async () => {
      const name = `${testPrefix}new-fail`;
      const { getOrCreateSession } = await import('../../src/client/session-manager.js');
      const result = await getOrCreateSession('/nonexistent/path.ts', name);

      assert.strictEqual(result, null);
    });

    it('should clean up stale session and fail to start', async () => {
      const name = `${testPrefix}stale`;
      const staleInfo = makeSessionInfo(name, {
        serverPid: 99999999,
        pid: 99999999,
      });
      saveSessionInfo(staleInfo);
      assert.ok(loadSessionInfo(name));

      const { getOrCreateSession } = await import('../../src/client/session-manager.js');
      const result = await getOrCreateSession('/nonexistent/path.ts', name);

      assert.strictEqual(result, null);
    });

    it('should return existing CDP session when same endpoint', async () => {
      const name = `${testPrefix}cdp-same`;
      const info = makeSessionInfo(name, {
        isCDP: true,
        cdpEndpoint: 'http://localhost:9222',
      });
      saveSessionInfo(info);

      const { getOrCreateSession } = await import('../../src/client/session-manager.js');
      const result = await getOrCreateSession('/path.ts', name, 'http://localhost:9222');

      assert.ok(result);
      assert.strictEqual(result!.info.cdpEndpoint, 'http://localhost:9222');
    });
  });
});
