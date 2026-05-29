import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { createDebugHost, type InferCommandMap } from '../../src/debug/index.js';
import { commandDefs } from './fixtures/demo-typecheck-plugin.js';

type DemoCommands = InferCommandMap<typeof commandDefs>;

const FIXTURE = resolve(__dirname, 'fixtures/demo-typecheck-plugin.ts');

async function loadDemoPlugin() {
  const host = createDebugHost();
  await host.load(FIXTURE);
  return host;
}

describe('TypedPluginHandle + InferCommandMap', () => {
  it('load returns handle with command names', async () => {
    const host = await loadDemoPlugin();
    expect(host.getCommandNames()).toEqual(
      expect.arrayContaining(['search', 'hotsearch', 'suggest'])
    );
  });

  it('exec search with typed params', async () => {
    const host = await loadDemoPlugin();
    const result = await host.exec<DemoCommands['search']['result']>('search', {
      query: 'TypeScript',
      pages: 2,
    });
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Result for TypeScript');
    expect(result.data[0].url).toBe('https://a.com');
    expect(result.tips).toContain('Found 1 result for "TypeScript"');
  });

  it('exec hotsearch with typed params', async () => {
    const host = await loadDemoPlugin();
    const result = await host.exec<DemoCommands['hotsearch']['result']>('hotsearch', {
      category: 'tech',
    });
    expect(result.success).toBe(true);
    expect(result.data[0].rank).toBe(1);
    expect(result.data[0].title).toBe('Hot topic');
    expect(result.data[0].heat).toBe('9999');
  });

  it('exec suggest with typed params', async () => {
    const host = await loadDemoPlugin();
    const result = await host.exec<DemoCommands['suggest']['result']>('suggest', { query: 'AI' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual(['AI tutorial', 'AI guide']);
  });

  it('InferCommandMap produces correct type shape', () => {
    type _SearchParams = DemoCommands['search']['params'];
    type _SearchResult = DemoCommands['search']['result'];

    const params: _SearchParams = { query: 'test', pages: 1, limit: 10 };
    const result: _SearchResult = [{ title: 't', url: 'u', snippet: 's' }];

    expect(params.query).toBe('test');
    expect(result[0].title).toBe('t');
  });

  it('exec returns CommandResult with typed data', async () => {
    const host = await loadDemoPlugin();
    const result = await host.exec('search', { query: 'test' });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data[0]).toHaveProperty('title');
    expect(result.data[0]).toHaveProperty('url');
    expect(result.data[0]).toHaveProperty('snippet');
  });
});
