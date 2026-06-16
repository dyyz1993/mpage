import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CommandEntry } from '../../src/protocol/plugin-protocol.js';
import { ok } from '../../src/command-result.js';

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

const baseConfig: CoreConfig = {
  name: 'test-cli',
  version: '1.0.0',
  description: 'A test CLI',
  configDirName: '.test-cli',
  envPrefix: 'TEST_CLI',
  pluginDirs: [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeEntry(handler: any): CommandEntry {
  return {
    name: 'scrape',
    description: 'scrape data',
    scope: 'page',
    override: false,
    handler,
  };
}

function setupCore(entry: CommandEntry): Core {
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

describe('ctx.tips integration', () => {
  let stdout: ReturnType<typeof vi.spyOn>;
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('collects tips from ctx.tips during handler execution', async () => {
    const handler = vi.fn(
      async (
        _p: Record<string, unknown>,
        ctx: { tips: { info: (m: string) => void; warn: (m: string, l?: string) => void } }
      ) => {
        ctx.tips.info('开始采集');
        ctx.tips.warn('第3页失败', 'PAGINATION');
        return ok([{ title: 'item1' }]);
      }
    );
    const core = setupCore(makeEntry(handler));

    await core.run(['scrape', '--json']);

    const stderrText = stderr.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(stderrText).toContain('开始采集');
    expect(stderrText).toContain('第3页失败');
    expect(stderrText).toContain('PAGINATION');
  });

  it('shows warn level icon for warn tips', async () => {
    const handler = vi.fn(
      async (_p: Record<string, unknown>, ctx: { tips: { warn: (m: string) => void } }) => {
        ctx.tips.warn('something concerning');
        return ok([]);
      }
    );
    const core = setupCore(makeEntry(handler));

    await core.run(['scrape', '--json']);

    const stderrText = stderr.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(stderrText).toContain('⚠️');
  });

  it('shows error level icon for error tips', async () => {
    const handler = vi.fn(
      async (_p: Record<string, unknown>, ctx: { tips: { error: (m: string) => void } }) => {
        ctx.tips.error('critical failure');
        return ok([]);
      }
    );
    const core = setupCore(makeEntry(handler));

    await core.run(['scrape', '--json']);

    const stderrText = stderr.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(stderrText).toContain('❌');
  });

  it('works without any ctx.tips calls (no error)', async () => {
    const handler = vi.fn(async () => ok([{ data: 'clean' }]));
    const core = setupCore(makeEntry(handler));

    const code = await core.run(['scrape', '--json']);
    expect(code).toBe(0);

    const stderrText = stderr.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(stderrText).not.toContain('💡');
    expect(stderrText).not.toContain('⚠️');
    expect(stderrText).not.toContain('❌');
  });

  it('merges ctx.tips with return-value tips', async () => {
    const handler = vi.fn(
      async (_p: Record<string, unknown>, ctx: { tips: { info: (m: string) => void } }) => {
        ctx.tips.info('ctx tip');
        return ok([1], [{ level: 'info' as const, message: 'return tip' }]);
      }
    );
    const core = setupCore(makeEntry(handler));

    await core.run(['scrape', '--json']);

    const stderrText = stderr.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(stderrText).toContain('ctx tip');
    expect(stderrText).toContain('return tip');
  });

  it('outputs tips in text mode to stdout', async () => {
    const handler = vi.fn(
      async (_p: Record<string, unknown>, ctx: { tips: { info: (m: string) => void } }) => {
        ctx.tips.info('text mode tip');
        return ok({ name: 'test' });
      }
    );
    const core = setupCore(makeEntry(handler));

    await core.run(['scrape']);

    const stdoutText = stdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
    expect(stdoutText).toContain('text mode tip');
  });
});
