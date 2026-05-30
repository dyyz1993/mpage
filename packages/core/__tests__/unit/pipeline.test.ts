import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Middleware } from '../../src/protocol/plugin-protocol.js';

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

function setupCoreWithCommand(entry: CommandEntry): Core {
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

describe('Middleware Pipeline', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('pipeline execution', () => {
    it('executes middleware in order', async () => {
      const order: string[] = [];
      const mw1: Middleware = async (_p, next) => {
        order.push('mw1-before');
        await next();
        order.push('mw1-after');
      };
      const mw2: Middleware = async (_p, next) => {
        order.push('mw2-before');
        await next();
        order.push('mw2-after');
      };

      const entry = makeEntry({
        handler: vi.fn(async () => {
          order.push('handler');
          return { success: true, data: 'ok', tips: [] };
        }),
      });
      const core = setupCoreWithCommand(entry);
      core.use(mw1);
      core.use(mw2);

      await core.run(['scrape']);

      expect(order).toEqual(['mw1-before', 'mw2-before', 'handler', 'mw2-after', 'mw1-after']);
    });

    it('middleware can short-circuit by not calling next()', async () => {
      const mw: Middleware = async (pipeline) => {
        pipeline.exitCode = 42;
      };
      const entry = makeEntry({
        handler: vi.fn(async () => ({ success: true })),
      });
      const core = setupCoreWithCommand(entry);
      core.use(mw);

      const code = await core.run(['scrape']);

      expect(code).toBe(42);
      expect(entry.handler).not.toHaveBeenCalled();
    });

    it('middleware can modify PipelineContext', async () => {
      const mw: Middleware = async (pipeline, next) => {
        (pipeline as Record<string, unknown>).custom = 'injected';
        await next();
      };

      const entry = makeEntry({
        handler: vi.fn(async () => {
          return { success: true, data: 'ok', tips: [] };
        }),
      });
      const core = setupCoreWithCommand(entry);
      core.use(mw);

      const code = await core.run(['scrape']);
      expect(code).toBe(0);
    });

    it('use() inserts middleware before handler', async () => {
      const order: string[] = [];
      const userMw: Middleware = async (_p, next) => {
        order.push('user');
        await next();
      };

      const entry = makeEntry({
        handler: vi.fn(async () => {
          order.push('handler');
          return { success: true, data: 'ok', tips: [] };
        }),
      });
      const core = setupCoreWithCommand(entry);
      core.use(userMw);

      await core.run(['scrape']);

      const userIndex = order.indexOf('user');
      const handlerIndex = order.indexOf('handler');
      expect(userIndex).toBeLessThan(handlerIndex);
    });
  });

  describe('built-in version check middleware', () => {
    it('returns 0 and prints version for --version', async () => {
      const core = new Core({ ...baseConfig });
      const code = await core.run(['--version']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('1.2.3');
    });

    it('returns 0 and prints version for -v', async () => {
      const core = new Core({ ...baseConfig });
      const code = await core.run(['-v']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('1.2.3');
    });
  });

  describe('built-in help middleware', () => {
    it('returns 0 and shows help for --help', async () => {
      const core = new Core({ ...baseConfig });
      const code = await core.run(['--help']);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test-cli'));
    });

    it('returns 0 and shows help for -h', async () => {
      const core = new Core({ ...baseConfig });
      const code = await core.run(['-h']);
      expect(code).toBe(0);
    });

    it('empty argv shows help', async () => {
      const core = new Core({ ...baseConfig });
      const code = await core.run([]);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('USAGE'));
    });
  });

  describe('built-in command resolve middleware', () => {
    it('unknown command returns exit code 1', async () => {
      const core = new Core({ ...baseConfig });
      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(null);
      (
        core.loader as unknown as { getAllCommands: ReturnType<typeof vi.fn> }
      ).getAllCommands.mockReturnValue([]);

      const code = await core.run(['foobar']);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command: foobar'));
    });
  });

  describe('PipelineContext carries result through stages', () => {
    it('result is set after handler middleware', async () => {
      let capturedResult: unknown;
      const verifyMw: Middleware = async (pipeline, next) => {
        await next();
        capturedResult = pipeline.result;
      };

      const entry = makeEntry({
        handler: vi.fn(async () => ({ success: true, data: [1, 2], tips: [] })),
      });
      const core = setupCoreWithCommand(entry);
      core.use(verifyMw);

      await core.run(['scrape']);

      expect(capturedResult).toBeDefined();
      expect((capturedResult as { data: number[] }).data).toEqual([1, 2]);
    });
  });

  describe('duration is set in PipelineContext', () => {
    it('duration is set after handler executes', async () => {
      let capturedDuration: number | undefined;
      const verifyMw: Middleware = async (pipeline, next) => {
        await next();
        capturedDuration = pipeline.duration;
      };

      const entry = makeEntry({
        handler: vi.fn(async () => {
          await new Promise((r) => setTimeout(r, 10));
          return { success: true, data: 'ok', tips: [] };
        }),
      });
      const core = setupCoreWithCommand(entry);
      core.use(verifyMw);

      await core.run(['scrape']);

      expect(typeof capturedDuration).toBe('number');
      expect(capturedDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('use() chaining', () => {
    it('supports chaining multiple use() calls', async () => {
      const order: string[] = [];
      const core = new Core({ ...baseConfig });

      const entry = makeEntry({
        handler: vi.fn(async () => {
          order.push('handler');
          return { success: true, data: 'ok', tips: [] };
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

      core
        .use(async (_p, next) => {
          order.push('a');
          await next();
        })
        .use(async (_p, next) => {
          order.push('b');
          await next();
        });

      await core.run(['scrape']);

      expect(order).toEqual(['a', 'b', 'handler']);
    });
  });

  describe('command-level --help', () => {
    it('shows command-specific help for <command> --help', async () => {
      const entry = makeEntry();
      const core = new Core({ ...baseConfig });
      (
        core.loader as unknown as { resolveCommand: ReturnType<typeof vi.fn> }
      ).resolveCommand.mockReturnValue(entry);

      await core.run(['scrape', '--help']);

      expect(logSpy).toHaveBeenCalled();
    });
  });
});
