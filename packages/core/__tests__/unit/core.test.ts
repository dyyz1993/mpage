import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'path';
import { homedir } from 'os';
import { z } from 'zod/v4';

vi.mock('../../src/plugin-loader.js', () => {
  const mockGetAllCommands = vi.fn(() => []);
  const mockResolveCommand = vi.fn(() => null);
  const mockFindCommand = vi.fn(() => null);
  const mockResolveNestedCommand = vi.fn(() => null);
  const mockGetSubCommands = vi.fn(() => []);

  class MockPluginLoader {
    getAllCommands = mockGetAllCommands;
    resolveCommand = mockResolveCommand;
    findCommand = mockFindCommand;
    resolveNestedCommand = mockResolveNestedCommand;
    getSubCommands = mockGetSubCommands;
  }

  return { PluginLoader: MockPluginLoader };
});

import { Core } from '../../src/core.js';
import type { CoreConfig } from '../../src/core.js';
import type { CommandEntry } from '../../src/protocol/plugin-protocol.js';

const baseConfig: CoreConfig = {
  name: 'test-cli',
  version: '1.2.3',
  description: 'A test CLI',
  configDirName: '.test-cli',
  envPrefix: 'TEST_CLI',
  pluginDirs: [],
};

function makeHandler(impl?: (params: Record<string, unknown>) => unknown) {
  return vi.fn(async (params: Record<string, unknown>) => {
    return impl ? impl(params) : { success: true };
  });
}

function makeEntry(overrides?: Partial<CommandEntry>): CommandEntry {
  return {
    name: 'scrape',
    description: 'scrape data',
    scope: 'page',
    override: false,
    handler: makeHandler(),
    ...overrides,
  };
}

describe('Core', () => {
  let core: Core;

  beforeEach(() => {
    vi.clearAllMocks();
    core = new Core({ ...baseConfig });
  });

  describe('constructor', () => {
    it('stores config', () => {
      expect(core.config.name).toBe('test-cli');
      expect(core.config.version).toBe('1.2.3');
    });

    it('computes configDir from homedir', () => {
      expect(core.configDir).toBe(join(homedir(), '.test-cli'));
    });

    it('computes sessionDir', () => {
      expect(core.sessionDir).toBe(join(homedir(), '.test-cli', 'sessions'));
    });

    it('computes storageDir', () => {
      expect(core.storageDir).toBe(join(homedir(), '.test-cli', 'storage'));
    });

    it('creates a PluginLoader', () => {
      expect(core.loader).toBeDefined();
    });
  });

  describe('getters', () => {
    it('returns name', () => {
      expect(core.name).toBe('test-cli');
    });

    it('returns version', () => {
      expect(core.version).toBe('1.2.3');
    });

    it('returns envPrefix', () => {
      expect(core.envPrefix).toBe('TEST_CLI');
    });
  });

  describe('envVar', () => {
    it('combines prefix with suffix', () => {
      expect(core.envVar('DEBUG')).toBe('TEST_CLI_DEBUG');
    });
  });

  describe('run', () => {
    it('returns 0 and prints version for --version', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await core.run(['--version']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('1.2.3');
      logSpy.mockRestore();
    });

    it('returns 0 and prints version for -v', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await core.run(['-v']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('1.2.3');
      logSpy.mockRestore();
    });

    it('returns 0 and shows help for --help', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await core.run(['--help']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test-cli'));
      logSpy.mockRestore();
    });

    it('returns 0 and shows help for -h', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await core.run(['-h']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('returns 0 and shows help for empty argv', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const code = await core.run([]);
      expect(code).toBe(0);
      logSpy.mockRestore();
    });

    it('returns 1 for unknown command', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(null);
      (
        core.loader as unknown as { getAllCommands: ReturnType<typeof vi.fn> }
      ).getAllCommands.mockReturnValue([]);

      const code = await core.run(['foobar']);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command: foobar'));
      errSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('suggests similar command on typo', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const handler = makeHandler();
      const entry = makeEntry({ handler });

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(null);
      (
        core.loader as unknown as { getAllCommands: ReturnType<typeof vi.fn> }
      ).getAllCommands.mockReturnValue([{ name: 'scrape', description: 'scrape data', handler }]);

      const code = await core.run(['scrap']);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Did you mean: scrape'));
      errSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('does not suggest when command is too different', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const handler = makeHandler();

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(null);
      (
        core.loader as unknown as { getAllCommands: ReturnType<typeof vi.fn> }
      ).getAllCommands.mockReturnValue([{ name: 'scrape', description: 'scrape data', handler }]);

      const code = await core.run(['xyz']);
      expect(code).toBe(1);
      expect(errSpy).not.toHaveBeenCalledWith(expect.stringContaining('Did you mean'));
      errSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('executes command and returns 0 on success', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const handler = makeHandler(() => ({ success: true, data: [1, 2, 3] }));
      const entry = makeEntry({ handler });

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(entry);
      (
        core.loader as unknown as { findCommand: ReturnType<typeof vi.fn> }
      ).findCommand.mockReturnValue({
        entry,
        site: {
          getStorage: () => ({
            get: () => Promise.resolve(null),
            set: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            clear: () => Promise.resolve(),
            keys: () => Promise.resolve([]),
          }),
        },
      });

      const code = await core.run(['scrape']);
      expect(code).toBe(0);
      expect(handler).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('returns 1 when handler throws', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const handler = makeHandler(() => {
        throw new Error('something broke');
      });
      const entry = makeEntry({ handler });

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(entry);
      (
        core.loader as unknown as { findCommand: ReturnType<typeof vi.fn> }
      ).findCommand.mockReturnValue({
        entry,
        site: {
          getStorage: () => ({
            get: () => Promise.resolve(null),
            set: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            clear: () => Promise.resolve(),
            keys: () => Promise.resolve([]),
          }),
        },
      });

      const code = await core.run(['scrape']);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('something broke');
      errSpy.mockRestore();
    });

    it('passes options and args to handler', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const handler = makeHandler(() => ({ ok: true }));
      const entry = makeEntry({ handler });

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(entry);
      (
        core.loader as unknown as { findCommand: ReturnType<typeof vi.fn> }
      ).findCommand.mockReturnValue({
        entry,
        site: {
          getStorage: () => ({
            get: () => Promise.resolve(null),
            set: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            clear: () => Promise.resolve(),
            keys: () => Promise.resolve([]),
          }),
        },
      });

      await core.run(['scrape', 'arg1', '--limit', '10']);
      expect(handler).toHaveBeenCalled();
      const call = handler.mock.calls[0];
      expect(call[1].args).toEqual(['arg1']);
      expect(call[1].options).toEqual({ limit: 10 });
      logSpy.mockRestore();
    });

    it('validates parameters with zod schema', async () => {
      const handler = makeHandler(() => ({ ok: true }));
      const entry = makeEntry({
        handler,
        parameters: z.object({
          count: z.number(),
        }),
      });

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(entry);
      (
        core.loader as unknown as { findCommand: ReturnType<typeof vi.fn> }
      ).findCommand.mockReturnValue({
        entry,
        site: {
          getStorage: () => ({
            get: () => Promise.resolve(null),
            set: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            clear: () => Promise.resolve(),
            keys: () => Promise.resolve([]),
          }),
        },
      });

      await expect(core.run(['scrape', '--count', 'abc'])).rejects.toThrow('expected number');
    });

    it('includes help in error output for unknown command', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(null);
      (
        core.loader as unknown as { getAllCommands: ReturnType<typeof vi.fn> }
      ).getAllCommands.mockReturnValue([]);

      await core.run(['nonexistent']);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
      expect(logSpy).toHaveBeenCalled();
      errSpy.mockRestore();
      logSpy.mockRestore();
    });
  });
});
