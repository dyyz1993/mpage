import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
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
      assert.ok(result.includes('my-session'));
      assert.ok(result.includes('sessions'));
    });
  });

  describe('getSessionFile', () => {
    it('should return session.json path', () => {
      const result = getSessionFile('my-session');
      assert.ok(result.endsWith('session.json'));
    });
  });

  describe('getSocketPath', () => {
    it('should return socket path under session dir', () => {
      const result = getSocketPath('my-session');
      assert.ok(result.endsWith('socket'));
      assert.ok(result.includes('my-session'));
    });
  });

  describe('saveSessionInfo + loadSessionInfo', () => {
    it('should save and load session info', async () => {
      const info = makeSessionInfo({ name: 'round-trip-test' });
      saveSessionInfo(info);

      const loaded = loadSessionInfo('round-trip-test');
      assert.ok(loaded !== null);
      assert.strictEqual(loaded!.name, 'round-trip-test');
      assert.strictEqual(loaded!.cdpEndpoint, info.cdpEndpoint);
      assert.strictEqual(loaded!.pid, info.pid);
      assert.strictEqual(loaded!.isCDP, info.isCDP);

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
      assert.ok(loaded !== null);
      assert.strictEqual(loaded!.isCDP, false);
      assert.strictEqual(loaded!.socketPath, '/custom/socket.sock');
      assert.strictEqual(loaded!.createdAt, 1700000000000);
      assert.strictEqual(loaded!.lastUsed, 1700000001000);

      await deleteSessionInfo('fields-test');
    });

    it('should overwrite existing session on save', async () => {
      const info1 = makeSessionInfo({ name: 'overwrite-test', pid: 11111 });
      saveSessionInfo(info1);

      const info2 = makeSessionInfo({ name: 'overwrite-test', pid: 22222 });
      saveSessionInfo(info2);

      const loaded = loadSessionInfo('overwrite-test');
      assert.ok(loaded !== null);
      assert.strictEqual(loaded!.pid, 22222);

      await deleteSessionInfo('overwrite-test');
    });
  });

  describe('loadSessionInfo', () => {
    it('should return null for non-existent session', () => {
      const result = loadSessionInfo('non-existent-session-xyz');
      assert.strictEqual(result, null);
    });
  });

  describe('deleteSessionInfo', () => {
    it('should delete session directory', async () => {
      const info = makeSessionInfo({ name: 'delete-test' });
      saveSessionInfo(info);

      const sessionPath = getSessionPath('delete-test');
      assert.ok(fs.existsSync(sessionPath));

      await deleteSessionInfo('delete-test');
      assert.ok(!fs.existsSync(sessionPath));
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

        assert.strictEqual(callCount, 3, 'should make 3 attempts');

        const delay1 = callTimestamps[1] - callTimestamps[0];
        const delay2 = callTimestamps[2] - callTimestamps[1];
        assert.ok(delay1 >= 50, `delay 1→2 should be >= 50ms, got ${delay1}ms`);
        assert.ok(delay2 >= 50, `delay 2→3 should be >= 50ms, got ${delay2}ms`);
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
      assert.ok(Array.isArray(sessions));
    });

    it('should list saved sessions', async () => {
      const info1 = makeSessionInfo({ name: 'list-test-1' });
      const info2 = makeSessionInfo({ name: 'list-test-2' });
      saveSessionInfo(info1);
      saveSessionInfo(info2);

      const sessions = listSessions();
      const names = sessions.map((s) => s.name);
      assert.ok(names.includes('list-test-1'));
      assert.ok(names.includes('list-test-2'));

      await deleteSessionInfo('list-test-1');
      await deleteSessionInfo('list-test-2');
    });

    it('should throw on corrupted session files (no built-in error handling)', async () => {
      const corruptPath = getSessionPath('corrupt-session');
      fs.mkdirSync(corruptPath, { recursive: true });
      fs.writeFileSync(path.join(corruptPath, 'session.json'), 'not-valid-json{{{', 'utf-8');

      assert.throws(() => {
        loadSessionInfo('corrupt-session');
      }, SyntaxError);

      await deleteSessionInfo('corrupt-session');
    });
  });

  describe('JSON file format', () => {
    it('should write pretty-printed JSON', async () => {
      const info = makeSessionInfo({ name: 'format-test' });
      saveSessionInfo(info);

      const fileContent = fs.readFileSync(getSessionFile('format-test'), 'utf-8');
      assert.ok(fileContent.includes('\n'));
      assert.ok(fileContent.includes('  '));

      const parsed = JSON.parse(fileContent);
      assert.strictEqual(parsed.name, 'format-test');

      await deleteSessionInfo('format-test');
    });
  });
});
