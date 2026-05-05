import { describe, it, expect, vi } from 'vitest';
import { queryCommands } from '../../../src/server/commands/query.js';
import type { Page } from 'playwright-core';

function createMockPage(): {
  page: Page;
  addScriptTagCalls: Array<{ content?: string; path?: string }>;
} {
  const addScriptTagCalls: Array<{ content?: string; path?: string }> = [];

  const page = {
    addScriptTag: vi.fn((opts: { content?: string; path?: string }) => {
      addScriptTagCalls.push({ content: opts.content, path: opts.path });
      return Promise.resolve();
    }),
    evaluate: vi.fn((_fn: (..._args: unknown[]) => unknown, ..._args: unknown[]) => {
      return Promise.resolve({
        layout: { containers: [], lists: [] },
        yaml: 'body: [1KB]',
      });
    }),
  } as unknown as Page;

  return { page, addScriptTagCalls };
}

describe('structure command - addScriptTag usage', () => {
  it('should use addScriptTag with content, not path', async () => {
    const { page, addScriptTagCalls } = createMockPage();

    await queryCommands.structure(page, { selector: 'body' });

    expect(addScriptTagCalls.length).toBe(1);

    const call = addScriptTagCalls[0];
    expect(call.path).toBeUndefined();
    expect(call.content).toBeTruthy();
    expect(call.content!.includes('__structureExtractor')).toBeTruthy();
  });

  it('should not write temp files via fs.writeFileSync', async () => {
    const { page } = createMockPage();

    const result = await queryCommands.structure(page, { selector: 'body' });
    expect(result).toBeTruthy();
  });

  it('should return structure and yaml from evaluate', async () => {
    const { page } = createMockPage();

    const result = await queryCommands.structure(page, { selector: '#main' });

    expect(result).toBeTruthy();
    const r = result as Record<string, unknown>;
    expect('structure' in r).toBeTruthy();
    expect('yaml' in r).toBeTruthy();
  });
});
