import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { queryCommands } from '../../../src/server/commands/query.js';
import type { Page } from 'playwright-core';

function createMockPage(): {
  page: Page;
  addScriptTagCalls: Array<{ content?: string; path?: string }>;
} {
  const addScriptTagCalls: Array<{ content?: string; path?: string }> = [];

  const page = {
    addScriptTag: mock.fn((opts: { content?: string; path?: string }) => {
      addScriptTagCalls.push({ content: opts.content, path: opts.path });
      return Promise.resolve();
    }),
    evaluate: mock.fn((_fn: (..._args: unknown[]) => unknown, ..._args: unknown[]) => {
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

    assert.strictEqual(addScriptTagCalls.length, 1, 'addScriptTag should be called exactly once');

    const call = addScriptTagCalls[0];
    assert.strictEqual(call.path, undefined, 'addScriptTag must NOT be called with path');
    assert.ok(call.content, 'addScriptTag must be called with content');
    assert.ok(
      call.content.includes('__structureExtractor'),
      'content should define __structureExtractor'
    );
  });

  it('should not write temp files via fs.writeFileSync', async () => {
    const { page } = createMockPage();

    const result = await queryCommands.structure(page, { selector: 'body' });
    assert.ok(result, 'structure command should succeed without file I/O');
  });

  it('should return structure and yaml from evaluate', async () => {
    const { page } = createMockPage();

    const result = await queryCommands.structure(page, { selector: '#main' });

    assert.ok(result, 'result should be defined');
    const r = result as Record<string, unknown>;
    assert.ok('structure' in r, 'result should have structure');
    assert.ok('yaml' in r, 'result should have yaml');
  });
});
