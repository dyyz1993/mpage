import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import * as path from 'path';
import os from 'os';
import {
  ensureStorage,
  getSessionPath,
  loadSessionInfo,
  saveSessionInfo,
  deleteSessionInfo,
  listSessions,
  isProcessRunning,
} from '../../src/session/storage.js';
import type { SessionInfo } from '../../src/types.js';

const DEFAULT_STORAGE = path.join(os.tmpdir(), 'mpage');

function makeSessionInfo(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    name: 'extra-test-session',
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

describe('storage - ensureStorage', () => {
  it('should create storage directory if it does not exist', () => {
    ensureStorage();
    expect(fs.existsSync(DEFAULT_STORAGE)).toBe(true);
  });

  it('should not throw if directory already exists', () => {
    ensureStorage();
    expect(() => ensureStorage()).not.toThrow();
  });
});

describe('storage - isProcessRunning', () => {
  it('should return true for current process', () => {
    expect(isProcessRunning(process.pid)).toBe(true);
  });

  it('should return false for non-existent PID', () => {
    expect(isProcessRunning(999999999)).toBe(false);
  });
});

describe('storage - deleteSessionInfo all retries fail', () => {
  it('should log error when all 3 retries fail', async () => {
    const info = makeSessionInfo({ name: 'fail-all-retries' });
    saveSessionInfo(info);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalRmSync = fs.rmSync;
    let callCount = 0;
    fs.rmSync = ((...args: [string, fs.RmSyncOptions?]) => {
      callCount++;
      throw new Error(`Simulated failure ${callCount}`);
    }) as typeof fs.rmSync;

    try {
      await deleteSessionInfo('fail-all-retries');
      expect(callCount).toBe(3);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete session directory')
      );
    } finally {
      fs.rmSync = originalRmSync;
      consoleSpy.mockRestore();
      const sessionPath = getSessionPath('fail-all-retries');
      if (fs.existsSync(sessionPath)) {
        originalRmSync(sessionPath, { recursive: true, force: true });
      }
    }
  });
});

describe('storage - listSessions with empty directory', () => {
  it('should handle sessions directory with only non-session subdirs', async () => {
    const sessionsPath = path.join(DEFAULT_STORAGE, 'sessions');
    const tempDirName = 'empty-dir-test-' + Date.now();
    const tempDir = path.join(sessionsPath, tempDirName);
    fs.mkdirSync(tempDir, { recursive: true });

    const sessions = listSessions();
    const found = sessions.find((s) => s.name === tempDirName);
    expect(found).toBeUndefined();

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
