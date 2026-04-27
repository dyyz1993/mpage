import { describe, it, expect, afterAll } from 'vitest';
import { resolve } from 'path';
import { PluginLoader } from '../../src/core/plugin-loader';

const PLUGIN_PATH = resolve(__dirname, '../../../.xcli/plugins/baidu/index.ts');

const EXPECTED_COMMANDS = ['search', 'hotsearch', 'suggest', 'news'];

describe('baidu plugin', () => {
  const loader = new PluginLoader();

  afterAll(async () => {
    await loader.unload();
  });

  it('should load without error', async () => {
    const instance = await loader.loadPlugin(PLUGIN_PATH, 'baidu');
    expect(instance.loaded).toBe(true);
    expect(instance.status).toBe('loaded');
  });

  it('should register the "baidu" site', () => {
    const site = loader.getSite('baidu');
    expect(site).toBeDefined();
    expect(site?.name).toBe('baidu');
  });

  it('should register all 4 commands', () => {
    const site = loader.getSite('baidu');
    const commands = site!.getAllCommands();
    const commandNames = commands.map((c) => c.name);

    expect(commandNames).toHaveLength(4);

    for (const name of EXPECTED_COMMANDS) {
      expect(commandNames).toContain(name);
    }
  });

  it('each command should be retrievable via getCommand', () => {
    const site = loader.getSite('baidu');

    for (const name of EXPECTED_COMMANDS) {
      const cmd = site!.getCommand(name);
      expect(cmd).not.toBeNull();
      expect(cmd!.name).toBe(name);
      expect(cmd!.handler).toBeTypeOf('function');
    }
  });

  it('all commands should have scope "browser"', () => {
    const site = loader.getSite('baidu');
    const commands = site!.getAllCommands();

    for (const cmd of commands) {
      expect(cmd.scope).toBe('browser');
    }
  });

  it('all commands should have a description', () => {
    const site = loader.getSite('baidu');
    const commands = site!.getAllCommands();

    for (const cmd of commands) {
      expect(cmd.description).toBeTruthy();
      expect(cmd.description.length).toBeGreaterThan(0);
    }
  });
});
