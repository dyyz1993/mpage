import { describe, it, expect, afterAll } from 'vitest';
import { resolve } from 'path';
import { PluginLoader } from '../../src/core/plugin-loader';

const PLUGIN_PATH = resolve(__dirname, '../../../.xcli/plugins/web-automation/index.ts');

const EXPECTED_COMMANDS = ['baidu-search', 'extract', 'paginate', 'fill-and-submit', 'screenshot'];

describe('web-automation plugin', () => {
  const loader = new PluginLoader();

  afterAll(async () => {
    await loader.unload();
  });

  it('should load without error', async () => {
    const instance = await loader.loadPlugin(PLUGIN_PATH, 'web-automation');
    expect(instance.loaded).toBe(true);
    expect(instance.status).toBe('loaded');
  });

  it('should register the "web-automation" site', () => {
    const site = loader.getSite('web-automation');
    expect(site).toBeDefined();
    expect(site?.name).toBe('web-automation');
  });

  it('should register all 5 commands', () => {
    const site = loader.getSite('web-automation');
    const commands = site!.getAllCommands();
    const commandNames = commands.map((c) => c.name);

    expect(commandNames).toHaveLength(5);

    for (const name of EXPECTED_COMMANDS) {
      expect(commandNames).toContain(name);
    }
  });

  it('each command should be retrievable via getCommand', () => {
    const site = loader.getSite('web-automation');

    for (const name of EXPECTED_COMMANDS) {
      const cmd = site!.getCommand(name);
      expect(cmd).not.toBeNull();
      expect(cmd!.name).toBe(name);
      expect(cmd!.handler).toBeTypeOf('function');
    }
  });

  it('all commands should have scope "browser"', () => {
    const site = loader.getSite('web-automation');
    const commands = site!.getAllCommands();

    for (const cmd of commands) {
      expect(cmd.scope).toBe('browser');
    }
  });

  it('all commands should have a description', () => {
    const site = loader.getSite('web-automation');
    const commands = site!.getAllCommands();

    for (const cmd of commands) {
      expect(cmd.description).toBeTruthy();
      expect(cmd.description.length).toBeGreaterThan(0);
    }
  });
});
