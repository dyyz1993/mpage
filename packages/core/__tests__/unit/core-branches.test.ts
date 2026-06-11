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

function makeHandler(impl?: (params: Record<string, unknown>, ctx?: unknown) => unknown) {
  return vi.fn(async (params: Record<string, unknown>, ctx?: unknown) => {
    return impl ? impl(params, ctx) : { success: true };
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

describe('Core - Branch Coverage', () => {
  let core: Core;

  beforeEach(() => {
    vi.clearAllMocks();
    core = new Core({ ...baseConfig });
  });

  describe('help with commands', () => {
    it('shows commands list when commands exist', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      (
        core.loader as unknown as { getAllCommands: ReturnType<typeof vi.fn> }
      ).getAllCommands.mockReturnValue([
        { name: 'cmd1', description: 'first command', handler: makeHandler() },
        { name: 'cmd2', description: 'second command', handler: makeHandler() },
      ]);

      const code = await core.run(['--help']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('COMMANDS'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('cmd1'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('cmd2'));
      logSpy.mockRestore();
    });
  });

  describe('command execution', () => {
    it('prints handler result when it returns an object', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const handler = makeHandler(() => ({ data: [1, 2, 3], count: 3 }));
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
      // Non-CommandResult objects are formatted via OutputFormatter in text mode
      const output = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(output).toContain('data');
      expect(output).toContain('count');
      expect(code).toBe(0);
      logSpy.mockRestore();
    });

    it('does not print when handler returns non-object', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const handler = makeHandler(() => null);
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
      expect(logSpy).not.toHaveBeenCalledWith(expect.anything());
      logSpy.mockRestore();
    });

    it('uses default storage when site not found and calls all methods', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedCtx: any;
      const handler = makeHandler(async (params, ctx) => {
        capturedCtx = ctx;
        return { success: true };
      });
      const entry = makeEntry({ handler });

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(entry);
      (
        core.loader as unknown as { findCommand: ReturnType<typeof vi.fn> }
      ).findCommand.mockReturnValue({
        entry,
        site: null,
      });

      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const code = await core.run(['scrape']);
      expect(code).toBe(0);

      expect(capturedCtx.storage).toBeDefined();
      await expect(capturedCtx.storage.get('x')).resolves.toBeNull();
      await capturedCtx.storage.set('x', 1);
      await capturedCtx.storage.delete('x');
      await capturedCtx.storage.clear();
      await expect(capturedCtx.storage.keys()).resolves.toEqual([]);

      capturedCtx.error('test error');
      expect(errSpy).toHaveBeenCalledWith('test error');
      errSpy.mockRestore();
    });

    it('uses site storage when site exists', async () => {
      const storage = {
        get: vi.fn(() => Promise.resolve('value')),
        set: vi.fn(() => Promise.resolve()),
        delete: vi.fn(() => Promise.resolve()),
        clear: vi.fn(() => Promise.resolve()),
        keys: vi.fn(() => Promise.resolve(['key1', 'key2'])),
      };
      const handler = makeHandler(() => ({ success: true }));
      const entry = makeEntry({ handler });

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(entry);
      (
        core.loader as unknown as { findCommand: ReturnType<typeof vi.fn> }
      ).findCommand.mockReturnValue({
        entry,
        site: {
          getStorage: () => storage,
        },
      });

      const code = await core.run(['scrape']);
      expect(code).toBe(0);
      const ctx = handler.mock.calls[0][1];
      expect(ctx.storage).toBe(storage);
    });
  });

  describe('parameter validation', () => {
    it('handles command without parameters', async () => {
      const handler = makeHandler(() => ({ success: true }));
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

      const code = await core.run(['scrape', '--opt1', 'value1']);
      expect(code).toBe(0);
      expect(handler).toHaveBeenCalled();
      const params = handler.mock.calls[0][0];
      expect(params).toEqual({ opt1: 'value1' });
    });

    it('assigns positional args to undefined keys', async () => {
      const handler = makeHandler(() => ({ success: true }));
      const entry = makeEntry({
        handler,
        parameters: z.object({
          url: z.string(),
          limit: z.number().optional(),
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

      const code = await core.run(['scrape', 'https://example.com', '--limit', '10']);
      expect(code).toBe(0);
      const params = handler.mock.calls[0][0];
      expect(params).toEqual({ url: 'https://example.com', limit: 10 });
    });

    it('does not override existing options with positional args', async () => {
      const handler = makeHandler(() => ({ success: true }));
      const entry = makeEntry({
        handler,
        parameters: z.object({
          url: z.string(),
          limit: z.number(),
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

      const code = await core.run(['scrape', '--limit', '20', 'https://example.com']);
      expect(code).toBe(0);
      const params = handler.mock.calls[0][0];
      expect(params).toEqual({ url: 'https://example.com', limit: 20 });
    });
  });

  describe('getZodShape branches', () => {
    const getShape = (schema: unknown) =>
      (core as { getZodShape(schema: unknown): Record<string, unknown> }).getZodShape(schema);

    it('returns empty object for null schema', () => {
      const schema = null;
      const result = getShape(schema);
      expect(result).toEqual({});
    });

    it('returns empty object for non-object schema', () => {
      const schema = 'invalid';
      const result = getShape(schema);
      expect(result).toEqual({});
    });

    it('returns empty object when def is missing', () => {
      const schema = {};
      const result = getShape(schema);
      expect(result).toEqual({});
    });

    it('returns empty object when type is not object', () => {
      const schema = { _def: { type: 'string' } };
      const result = getShape(schema);
      expect(result).toEqual({});
    });

    it('returns empty object when shape is missing', () => {
      const schema = { _def: { type: 'object' } };
      const result = getShape(schema);
      expect(result).toEqual({});
    });

    it('extracts shape as object', () => {
      const shapeObj = { field1: 'value1', field2: 'value2' };
      const schema = { _def: { type: 'object', shape: shapeObj } };
      const result = getShape(schema);
      expect(result).toEqual({ field1: 'value1', field2: 'value2' });
    });
  });

  describe('suggestCommand branches', () => {
    it('returns null when no commands available', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(null);
      (
        core.loader as unknown as { getAllCommands: ReturnType<typeof vi.fn> }
      ).getAllCommands.mockReturnValue([]);

      await core.run(['unknown']);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command: unknown'));
      expect(errSpy).not.toHaveBeenCalledWith(expect.stringContaining('Did you mean'));
      errSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('returns null when all distances exceed threshold', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(null);
      (
        core.loader as unknown as { getAllCommands: ReturnType<typeof vi.fn> }
      ).getAllCommands.mockReturnValue([
        { name: 'scrape', description: 'scrape data', handler: makeHandler() },
      ]);

      await core.run(['verylongcommandname']);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
      expect(errSpy).not.toHaveBeenCalledWith(expect.stringContaining('Did you mean'));
      errSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('handles non-Error exceptions', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const handler = makeHandler(() => {
        throw 'string error';
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
      expect(errSpy).toHaveBeenCalledWith('string error');
      errSpy.mockRestore();
    });

    it('handles null exceptions', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const handler = makeHandler(() => {
        throw null;
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
      expect(errSpy).toHaveBeenCalledWith('null');
      errSpy.mockRestore();
    });
  });
});
