/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable require-await */
import { describe, it, expect } from 'vitest';
import { PluginLoader } from '../../src/core/plugin-loader';
import { z } from 'zod';

describe('Command Override', () => {
  it('plugin command can be registered on a site', async () => {
    const loader = new PluginLoader();

    loader.loadFromFunction((api) => {
      const site = api.createSite({
        name: 'override-test',
        url: 'https://example.com',
      });

      site.command('scrape', {
        description: 'Scrape data',
        parameters: z.object({ url: z.string() }),
        handler: async (params) => ({ data: params.url }),
      });
    });

    const site = loader.getSite('override-test');
    expect(site).toBeDefined();

    const cmd = site!.getCommand('scrape');
    expect(cmd).not.toBeNull();
    expect(cmd!.description).toBe('Scrape data');
  });

  it('command with override: true replaces existing command', async () => {
    const loader = new PluginLoader();

    loader.loadFromFunction((api) => {
      const site = api.createSite({
        name: 'override-site',
        url: 'https://example.com',
      });

      site.command('fetch', {
        description: 'Original fetch',
        parameters: z.object({}),
        handler: async () => ({ version: 1 }),
      });

      site.command('fetch', {
        description: 'Override fetch',
        override: true,
        parameters: z.object({}),
        handler: async () => ({ version: 2 }),
      });
    });

    const site = loader.getSite('override-site');
    const cmd = site!.getCommand('fetch');
    expect(cmd).not.toBeNull();
    expect(cmd!.description).toBe('Override fetch');
  });

  it('command with override: false prevents replacement', async () => {
    const loader = new PluginLoader();

    loader.loadFromFunction((api) => {
      const site = api.createSite({
        name: 'no-override-site',
        url: 'https://example.com',
      });

      site.command('lock', {
        description: 'Locked command',
        override: false,
        parameters: z.object({}),
        handler: async () => ({ locked: true }),
      });

      site.command('lock', {
        description: 'Attempted override',
        override: true,
        parameters: z.object({}),
        handler: async () => ({ locked: false }),
      });
    });

    const site = loader.getSite('no-override-site');
    const cmd = site!.getCommand('lock');
    expect(cmd).not.toBeNull();
    expect(cmd!.description).toBe('Locked command');
  });

  it('later plugin with same site name overrides earlier', async () => {
    const loader = new PluginLoader();

    loader.loadFromFunction((api) => {
      const site = api.createSite({
        name: 'shared-name',
        url: 'https://v1.com',
      });

      site.command('action', {
        description: 'V1 action',
        parameters: z.object({}),
        handler: async () => ({ v: 1 }),
      });
    });

    loader.loadFromFunction((api) => {
      const site = api.createSite({
        name: 'shared-name',
        url: 'https://v2.com',
      });

      site.command('action', {
        description: 'V2 action',
        parameters: z.object({}),
        handler: async () => ({ v: 2 }),
      });
    });

    const site = loader.getSite('shared-name');
    expect(site!.url).toBe('https://v2.com');

    const cmd = site!.getCommand('action');
    expect(cmd!.description).toBe('V2 action');
  });

  it('unloading a plugin cleans up its commands', async () => {
    const loader = new PluginLoader();

    const { writeFileSync, mkdirSync, rmSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const { tmpdir } = await import('os');

    const tmpDir = join(tmpdir(), 'xcli-test-cmd-override');
    mkdirSync(tmpDir, { recursive: true });

    const pluginPath = join(tmpDir, 'index.ts');
    writeFileSync(
      pluginPath,
      [
        'export default function(xcli) {',
        "  const site = xcli.createSite({ name: 'cleanup-test', url: 'https://example.com' });",
        "  site.command('temp-cmd', { description: 'Temp', parameters: {}, handler: async () => ({}) });",
        '}',
      ].join('\n')
    );

    await loader.loadPlugin(pluginPath, 'cleanup-test');
    expect(loader.getSite('cleanup-test')).toBeDefined();
    expect(loader.getSite('cleanup-test')!.getCommand('temp-cmd')).not.toBeNull();

    await loader.unloadPlugin('cleanup-test');
    expect(loader.getSite('cleanup-test')).toBeUndefined();
    expect(loader.getPlugin('cleanup-test')).toBeUndefined();

    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolveCommand returns null for unknown command', () => {
    const loader = new PluginLoader();
    expect(loader.resolveCommand('nonexistent')).toBeNull();
  });

  it('resolveCommand finds command across sites', async () => {
    const loader = new PluginLoader();

    loader.loadFromFunction((api) => {
      const siteA = api.createSite({ name: 'site-a', url: 'https://a.com' });
      siteA.command('cmd-a', {
        description: 'Command A',
        parameters: z.object({}),
        handler: async () => ({}),
      });

      const siteB = api.createSite({ name: 'site-b', url: 'https://b.com' });
      siteB.command('cmd-b', {
        description: 'Command B',
        parameters: z.object({}),
        handler: async () => ({}),
      });
    });

    expect(loader.resolveCommand('cmd-a')).not.toBeNull();
    expect(loader.resolveCommand('cmd-b')).not.toBeNull();
    expect(loader.resolveCommand('cmd-c')).toBeNull();
  });

  it('findCommand can filter by scope', async () => {
    const loader = new PluginLoader();

    loader.loadFromFunction((api) => {
      const site = api.createSite({ name: 'scope-filter', url: 'https://example.com' });
      site.command('proj', {
        description: 'Project cmd',
        scope: 'project',
        parameters: z.object({}),
        handler: async () => ({}),
      });
      site.command('pg', {
        description: 'Page cmd',
        scope: 'page',
        parameters: z.object({}),
        handler: async () => ({}),
      });
    });

    const projectResult = loader.findCommand('proj', 'project');
    expect(projectResult).not.toBeNull();
    expect(projectResult!.entry.scope).toBe('project');

    const pageFilteredProject = loader.findCommand('proj', 'page');
    expect(pageFilteredProject).toBeNull();

    const pageResult = loader.findCommand('pg', 'page');
    expect(pageResult).not.toBeNull();
    expect(pageResult!.entry.scope).toBe('page');
  });
});
