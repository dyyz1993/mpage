import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import type { CommandEntry, AfterHookContext } from '../../src/protocol/plugin-protocol.js';

const baseConfig: CoreConfig = {
  name: 'test-cli',
  version: '1.0.0',
  description: 'A test CLI',
  configDirName: '.test-cli',
  envPrefix: 'TEST_CLI',
  pluginDirs: [],
};

function makeEntry(overrides?: Partial<CommandEntry>): CommandEntry {
  return {
    name: 'test-cmd',
    description: 'test command',
    scope: 'page',
    override: false,
    handler: vi.fn(async () => ({ success: true, data: 'ok', tips: [] })),
    ...overrides,
  };
}

function setupCore(entry: CommandEntry) {
  const core = new Core({ ...baseConfig });
  (
    core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
  ).resolveCommand.mockReturnValue(entry);
  (core.loader as unknown as { findCommand: ReturnType<typeof vi.fn> }).findCommand.mockReturnValue(
    {
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
    }
  );
  return core;
}

describe('Command lifecycle hooks', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('beforeCommand hook fires before handler', async () => {
    const order: string[] = [];
    const handler = vi.fn(async () => {
      order.push('handler');
      return { success: true, data: 'ok', tips: [] };
    });
    const entry = makeEntry({ handler });
    const core = setupCore(entry);

    const beforeHook = vi.fn(async () => {
      order.push('before');
    });
    core.registerHooks({ beforeCommand: beforeHook });

    await core.run(['test-cmd']);

    expect(order).toEqual(['before', 'handler']);
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('afterCommand hook fires after handler with result and duration', async () => {
    const handler = vi.fn(async () => ({ success: true, data: { count: 5 }, tips: [] }));
    const entry = makeEntry({ handler });
    const core = setupCore(entry);

    const afterHook = vi.fn(async (hookCtx: AfterHookContext) => {
      expect(hookCtx.result.success).toBe(true);
      expect(hookCtx.result.data).toEqual({ count: 5 });
      expect(hookCtx.duration).toBeGreaterThanOrEqual(0);
      expect(hookCtx.command).toBe('test-cmd');
    });
    core.registerHooks({ afterCommand: afterHook });

    await core.run(['test-cmd']);

    expect(afterHook).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('multiple hooks fire in registration order', async () => {
    const order: string[] = [];
    const handler = vi.fn(async () => {
      order.push('handler');
      return { success: true, data: 'ok', tips: [] };
    });
    const entry = makeEntry({ handler });
    const core = setupCore(entry);

    core.registerHooks({
      beforeCommand: async () => {
        order.push('before1');
      },
      afterCommand: async () => {
        order.push('after1');
      },
    });
    core.registerHooks({
      beforeCommand: async () => {
        order.push('before2');
      },
      afterCommand: async () => {
        order.push('after2');
      },
    });

    await core.run(['test-cmd']);

    expect(order).toEqual(['before1', 'before2', 'handler', 'after1', 'after2']);
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('beforeCommand hook error does not block handler execution', async () => {
    const handler = vi.fn(async () => ({ success: true, data: 'ok', tips: [] }));
    const entry = makeEntry({ handler });
    const core = setupCore(entry);

    core.registerHooks({
      beforeCommand: async () => {
        throw new Error('hook boom');
      },
    });

    const code = await core.run(['test-cmd']);

    expect(handler).toHaveBeenCalled();
    expect(code).toBe(0);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('beforeCommand hook error: hook boom')
    );
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('afterCommand hook error does not block other hooks', async () => {
    const handler = vi.fn(async () => ({ success: true, data: 'ok', tips: [] }));
    const entry = makeEntry({ handler });
    const core = setupCore(entry);

    const afterHook2 = vi.fn(async () => {});
    core.registerHooks({
      afterCommand: async () => {
        throw new Error('after boom');
      },
    });
    core.registerHooks({
      afterCommand: afterHook2,
    });

    const code = await core.run(['test-cmd']);

    expect(code).toBe(0);
    expect(afterHook2).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('afterCommand hook error: after boom')
    );
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('hooks work with async handlers', async () => {
    const handler = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { success: true, data: 'delayed', tips: [] };
    });
    const entry = makeEntry({ handler });
    const core = setupCore(entry);

    const afterHook = vi.fn(async (hookCtx: AfterHookContext) => {
      expect(hookCtx.duration).toBeGreaterThanOrEqual(10);
    });
    core.registerHooks({ afterCommand: afterHook });

    await core.run(['test-cmd']);

    expect(afterHook).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('no hooks registered — handler runs normally', async () => {
    const handler = vi.fn(async () => ({ success: true, data: 'ok', tips: [] }));
    const entry = makeEntry({ handler });
    const core = setupCore(entry);

    const code = await core.run(['test-cmd']);

    expect(code).toBe(0);
    expect(handler).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('afterCommand receives correct duration (number > 0)', async () => {
    const handler = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return { success: true, data: 'ok', tips: [] };
    });
    const entry = makeEntry({ handler });
    const core = setupCore(entry);

    let receivedDuration = 0;
    core.registerHooks({
      afterCommand: async (hookCtx: AfterHookContext) => {
        receivedDuration = hookCtx.duration;
      },
    });

    await core.run(['test-cmd']);

    expect(typeof receivedDuration).toBe('number');
    expect(receivedDuration).toBeGreaterThan(0);
    logSpy.mockRestore();
    errSpy.mockRestore();
  });
});
