import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TMP_SESSION_DIR = join(tmpdir(), 'xcli-test-commands');
const TMP_DAEMON_CONFIG = join(TMP_SESSION_DIR, 'daemon.json');

vi.mock('../../src/core/constants', () => ({
  SESSION_DIR: TMP_SESSION_DIR,
  DAEMON_CONFIG_PATH: TMP_DAEMON_CONFIG,
  DAEMON_SOCKET_PATH: join(TMP_SESSION_DIR, 'daemon.sock'),
  DEFAULT_CHROMIUM_PATH: '/usr/bin/chromium',
}));

const mockNavigateSession = vi.fn();
const mockRefreshSession = vi.fn();
const mockGotoSession = vi.fn();
const mockScreenshotSession = vi.fn();

vi.mock('../../src/core/session-client', () => ({
  navigateSession: (...args: unknown[]) => mockNavigateSession(...args),
  refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
  gotoSession: (...args: unknown[]) => mockGotoSession(...args),
  screenshotSession: (...args: unknown[]) => mockScreenshotSession(...args),
}));

function setupSessionFile(name = 'default') {
  mkdirSync(TMP_SESSION_DIR, { recursive: true });
  const sessionFile = join(TMP_SESSION_DIR, `${name}.json`);
  writeFileSync(sessionFile, JSON.stringify({ id: '1', name, url: 'https://example.com' }));
}

describe('commands', () => {
  beforeEach(() => {
    mkdirSync(TMP_SESSION_DIR, { recursive: true });
    mockNavigateSession.mockReset();
    mockRefreshSession.mockReset();
    mockGotoSession.mockReset();
    mockScreenshotSession.mockReset();
  });

  afterEach(() => {
    if (existsSync(TMP_SESSION_DIR)) {
      rmSync(TMP_SESSION_DIR, { recursive: true, force: true });
    }
  });

  describe('create command', () => {
    it('creates plugin directory with index.ts and package.json', async () => {
      const { createCommand } = await import('../../src/commands/create');
      const pluginDir = join(process.cwd(), '.xcli', 'plugins', 'test-create-cmd');

      try {
        await createCommand([], { name: 'test-create-cmd' });

        expect(existsSync(pluginDir)).toBe(true);
        expect(existsSync(join(pluginDir, 'index.ts'))).toBe(true);
        expect(existsSync(join(pluginDir, 'package.json'))).toBe(true);

        const pkg = JSON.parse(readFileSync(join(pluginDir, 'package.json'), 'utf-8'));
        expect(pkg.name).toBe('test-create-cmd');
        expect(pkg.version).toBe('1.0.0');

        const indexContent = readFileSync(join(pluginDir, 'index.ts'), 'utf-8');
        expect(indexContent).toContain('test-create-cmd');
      } finally {
        if (existsSync(pluginDir)) {
          rmSync(pluginDir, { recursive: true, force: true });
        }
      }
    });

    it('exits when plugin already exists', async () => {
      const { createCommand } = await import('../../src/commands/create');
      const pluginDir = join(process.cwd(), '.xcli', 'plugins', 'test-dup');

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('EXIT');
      });

      try {
        mkdirSync(pluginDir, { recursive: true });
        await expect(createCommand([], { name: 'test-dup' })).rejects.toThrow('EXIT');
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        exitSpy.mockRestore();
        if (existsSync(pluginDir)) {
          rmSync(pluginDir, { recursive: true, force: true });
        }
      }
    });
  });

  describe('navigate command', () => {
    it('navigates back', async () => {
      const { navigateCommand } = await import('../../src/commands/navigate');
      setupSessionFile('default');
      mockNavigateSession.mockResolvedValue({ ok: true });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await navigateCommand(['back'], { session: 'default' });

      expect(mockNavigateSession).toHaveBeenCalledWith('default', 'back');
      logSpy.mockRestore();
    });

    it('navigates forward', async () => {
      const { navigateCommand } = await import('../../src/commands/navigate');
      setupSessionFile('default');
      mockNavigateSession.mockResolvedValue({ ok: true });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await navigateCommand(['forward'], { session: 'default' });

      expect(mockNavigateSession).toHaveBeenCalledWith('default', 'forward');
      logSpy.mockRestore();
    });

    it('navigates to URL with goto', async () => {
      const { navigateCommand } = await import('../../src/commands/navigate');
      setupSessionFile('default');
      mockGotoSession.mockResolvedValue({ ok: true });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await navigateCommand(['goto', 'https://new.com'], { session: 'default' });

      expect(mockGotoSession).toHaveBeenCalledWith('default', 'https://new.com');
      logSpy.mockRestore();
    });

    it('exits when session not found', async () => {
      const { navigateCommand } = await import('../../src/commands/navigate');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('EXIT');
      });

      try {
        await expect(navigateCommand(['back'], { session: 'missing' })).rejects.toThrow('EXIT');
        expect(exitSpy).toHaveBeenCalledWith(1);
      } finally {
        exitSpy.mockRestore();
      }
    });
  });

  describe('screenshot command', () => {
    it('captures screenshot with base64 data', async () => {
      const { screenshotCommand } = await import('../../src/commands/screenshot');

      const homeDir = process.env.HOME || '/tmp';
      mkdirSync(join(homeDir, '.xcli', 'sessions'), { recursive: true });
      const sessionFile = join(homeDir, '.xcli', 'sessions', 'default.json');
      writeFileSync(
        sessionFile,
        JSON.stringify({ id: '1', name: 'default', url: 'https://example.com' })
      );

      mockScreenshotSession.mockResolvedValueOnce('data:image/png;base64,abc123');

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await screenshotCommand([], { session: 'default' });
      expect(logSpy).toHaveBeenCalled();

      const output = JSON.parse(logSpy.mock.calls[0][0]);
      expect(output.data).toBe('data:image/png;base64,abc123');
      logSpy.mockRestore();

      rmSync(join(process.env.HOME || '/tmp', '.xcli', 'sessions', 'default.json'));
    });

    it('exits when session not found', async () => {
      const { screenshotCommand } = await import('../../src/commands/screenshot');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('EXIT');
      });

      try {
        await expect(screenshotCommand([], { session: 'missing' })).rejects.toThrow('EXIT');
      } finally {
        exitSpy.mockRestore();
      }
    });
  });
});
