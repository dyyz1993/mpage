import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CommandEntry } from '../../src/protocol/plugin-protocol.js';
import { ok, fail } from '../../src/command-result.js';
import { tip } from '../../src/tip.js';

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

describe('Core.run() output formatting', () => {
  let stdout: ReturnType<typeof vi.spyOn>;
  let stderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ─── Group 1: --json mode ───

  describe('--json mode', () => {
    it('should output only data to stdout (no success/tips/meta)', async () => {
      const handler = vi.fn(async () => ok([{ title: 'hello' }], [tip.info('采集到 1 篇文章')]));
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape', '--json']);

      const stdoutCalls = stdout.mock.calls.map((c: unknown[]) => String(c[0]));
      const output = stdoutCalls.join('\n');

      const parsed = JSON.parse(output);
      expect(parsed).toEqual([{ title: 'hello' }]);
      expect(parsed).not.toHaveProperty('success');
      expect(parsed).not.toHaveProperty('tips');
    });

    it('should send tips to stderr in json mode', async () => {
      const handler = vi.fn(async () =>
        ok([1, 2, 3], [tip.info('采集到 3 条数据'), tip.info('耗时 1.2s')])
      );
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape', '--json']);

      const stderrText = stderr.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(stderrText).toContain('采集到 3 条数据');
      expect(stderrText).toContain('耗时 1.2s');
    });

    it('should produce valid JSON when data is complex', async () => {
      const data = {
        items: [
          { id: 1, name: 'a' },
          { id: 2, name: 'b' },
        ],
        total: 2,
      };
      const handler = vi.fn(async () => ok(data));
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape', '--json']);

      const output = stdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      const parsed = JSON.parse(output);
      expect(parsed).toEqual(data);
    });

    it('should output raw data for non-CommandResult objects', async () => {
      const handler = vi.fn(async () => ({ raw: true, count: 5 }));
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape', '--json']);

      const output = stdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      const parsed = JSON.parse(output);
      expect(parsed).toEqual({ raw: true, count: 5 });
    });
  });

  // ─── Group 2: --yaml mode ───

  describe('--yaml mode', () => {
    it('should output YAML formatted data to stdout', async () => {
      const handler = vi.fn(async () => ok([{ title: 'hello', count: 1 }], [tip.info('1 条记录')]));
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape', '--yaml']);

      const output = stdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(output).toContain('title: hello');
      expect(output).toContain('count: 1');
      expect(output).not.toContain('success');
    });

    it('should send tips to stderr in yaml mode', async () => {
      const handler = vi.fn(async () => ok([1], [tip.info('yaml tip')]));
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape', '--yaml']);

      const stderrText = stderr.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(stderrText).toContain('yaml tip');
    });
  });

  // ─── Group 3: default text mode ───

  describe('default text mode', () => {
    it('should set ctx.output.mode to text without flags', async () => {
      let receivedMode = '';
      const handler = vi.fn(
        async (_p: Record<string, unknown>, ctx: { output: { mode: string } }) => {
          receivedMode = ctx.output.mode;
          return ok([1]);
        }
      );
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape']);

      expect(receivedMode).toBe('text');
    });

    it('should output data + tips to stdout in text mode', async () => {
      const handler = vi.fn(async () => ok({ name: 'test' }, [tip.info('这是一个提示')]));
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape']);

      const output = stdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(output).toContain('test');
      expect(output).toContain('这是一个提示');
    });

    it('should not send tips to stderr in text mode', async () => {
      const handler = vi.fn(async () => ok([1], [tip.info('text tip')]));
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape']);

      const stderrText = stderr.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(stderrText).not.toContain('text tip');
    });
  });

  // ─── Group 4: ctx.output propagation ───

  describe('ctx.output mode propagation', () => {
    it('should set ctx.output.mode to json with --json', async () => {
      let receivedMode = '';
      const handler = vi.fn(
        async (_p: Record<string, unknown>, ctx: { output: { mode: string } }) => {
          receivedMode = ctx.output.mode;
          return ok([1]);
        }
      );
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape', '--json']);

      expect(receivedMode).toBe('json');
    });

    it('should set ctx.output.mode to yaml with --yaml', async () => {
      let receivedMode = '';
      const handler = vi.fn(
        async (_p: Record<string, unknown>, ctx: { output: { mode: string } }) => {
          receivedMode = ctx.output.mode;
          return ok([1]);
        }
      );
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape', '--yaml']);

      expect(receivedMode).toBe('yaml');
    });
  });

  // ─── Group 5: edge cases ───

  describe('edge cases', () => {
    it('should not output to stdout when handler returns undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = vi.fn(async () => {}) as any;
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape']);

      expect(stdout).not.toHaveBeenCalled();
    });

    it('should output string result without crash', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = vi.fn(async () => 'plain text result') as any;
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape']);

      const output = stdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(output).toContain('plain text result');
    });

    it('should send error to stderr and return 1 when handler throws', async () => {
      const handler = vi.fn(async () => {
        throw new Error('boom');
      });
      const core = setupCore(makeEntry(handler));

      const code = await core.run(['scrape']);

      expect(code).toBe(1);
      expect(stderr).toHaveBeenCalledWith('boom');
    });

    it('should handle fail() result correctly in json mode', async () => {
      const handler = vi.fn(async () => fail('something went wrong', [tip.error('error tip')]));
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape', '--json']);

      const output = stdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      const parsed = JSON.parse(output);
      expect(parsed).toBeNull();

      const stderrText = stderr.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(stderrText).toContain('error tip');
    });

    it('should output CommandResult.data even when data is empty array', async () => {
      const handler = vi.fn(async () => ok([], [tip.info('empty')]));
      const core = setupCore(makeEntry(handler));

      await core.run(['scrape', '--json']);

      const output = stdout.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
      expect(JSON.parse(output)).toEqual([]);
    });
  });
});
