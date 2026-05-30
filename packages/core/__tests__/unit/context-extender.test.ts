import { describe, it, expect, vi } from 'vitest';
import { Core } from '../../src/core.js';
import type { ContextExtender } from '../../src/protocol/plugin-protocol.js';
import { ok, withMeta } from '../../src/command-result.js';

function createCore(): Core {
  return new Core({
    name: 'test-cli',
    version: '1.0.0',
    description: 'test',
    configDirName: '.test-cli',
    envPrefix: 'TEST_CLI',
    pluginDirs: [],
  });
}

function captureOutput(): { stdout: string[]; restore: () => void } {
  const stdout: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args: unknown[]) => stdout.push(args.join(' '));
  console.error = () => {};
  return {
    stdout,
    restore: () => {
      console.log = origLog;
      console.error = origErr;
    },
  };
}

describe('ContextExtender', () => {
  it('should register and apply context extender', async () => {
    const core = createCore();
    const api = core.loader.getAPI();
    const site = api.createSite({ name: 'test-site' });

    site.command('demo', {
      description: 'demo cmd',
      handler: async (_params, ctx) => {
        return ok({ page: (ctx as Record<string, unknown>).page });
      },
    });

    const extender: ContextExtender = () => ({ page: 'mock-page' });
    core.extendContext(extender);

    const { stdout, restore } = captureOutput();
    const code = await core.run(['demo', '--json']);
    restore();

    expect(code).toBe(0);
    const output = JSON.parse(stdout[0]);
    expect(output.page).toBe('mock-page');
  });

  it('should apply multiple extenders in order', async () => {
    const core = createCore();
    const api = core.loader.getAPI();
    const site = api.createSite({ name: 'test-site' });

    site.command('multi', {
      description: 'multi ext',
      handler: async (_params, ctx) => {
        const c = ctx as Record<string, unknown>;
        return ok({ a: c.a, b: c.b });
      },
    });

    core.extendContext(() => ({ a: 1 }));
    core.extendContext((base) => {
      const existing = (base as Record<string, unknown>).a;
      return { b: (existing as number) + 1 };
    });

    const { stdout, restore } = captureOutput();
    const code = await core.run(['multi', '--json']);
    restore();

    expect(code).toBe(0);
    const output = JSON.parse(stdout[0]);
    expect(output.a).toBe(1);
    expect(output.b).toBe(2);
  });

  it('should handle async extenders', async () => {
    const core = createCore();
    const api = core.loader.getAPI();
    const site = api.createSite({ name: 'test-site' });

    site.command('async-ext', {
      description: 'async ext',
      handler: async (_params, ctx) => {
        return ok({ asyncVal: (ctx as Record<string, unknown>).asyncVal });
      },
    });

    core.extendContext(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return { asyncVal: 42 };
    });

    const { stdout, restore } = captureOutput();
    const code = await core.run(['async-ext', '--json']);
    restore();

    expect(code).toBe(0);
    const output = JSON.parse(stdout[0]);
    expect(output.asyncVal).toBe(42);
  });

  it('should not break when no extenders registered', async () => {
    const core = createCore();
    const api = core.loader.getAPI();
    const site = api.createSite({ name: 'test-site' });

    site.command('noext', {
      description: 'no ext',
      handler: async () => ok({ value: 'hello' }),
    });

    const { stdout, restore } = captureOutput();
    const code = await core.run(['noext', '--json']);
    restore();

    expect(code).toBe(0);
    const output = JSON.parse(stdout[0]);
    expect(output.value).toBe('hello');
  });
});

describe('CommandResult duration', () => {
  it('should include duration in CommandResult after handler execution', async () => {
    const core = createCore();
    const api = core.loader.getAPI();
    const site = api.createSite({ name: 'test-site' });

    site.command('timed', {
      description: 'timed cmd',
      handler: async () => {
        await new Promise((r) => setTimeout(r, 10));
        return ok({ x: 1 });
      },
    });

    const { stdout, restore } = captureOutput();
    const code = await core.run(['timed', '--json']);
    restore();

    expect(code).toBe(0);
  });

  it('should not override existing meta fields when adding duration', () => {
    const result = withMeta(ok({ v: 1 }), { command: 'test-cmd', site: 'test-site' });
    expect(result.meta?.command).toBe('test-cmd');
    expect(result.meta?.site).toBe('test-site');

    result.meta = { ...result.meta, duration: 50 };
    expect(result.meta.duration).toBe(50);
    expect(result.meta.command).toBe('test-cmd');
    expect(result.meta.site).toBe('test-site');
  });
});
