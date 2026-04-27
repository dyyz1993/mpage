import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { Page } from 'playwright-core';

function createCapturePage(): { page: Page; getSource: () => string } {
  let source = '';
  const page = {
    evaluate: mock.fn((fn: unknown) => {
      if (typeof fn === 'function') {
        source = fn.toString();
      }
      return Promise.resolve([]);
    }),
  } as unknown as Page;
  return { page, getSource: () => source };
}

describe('find command', () => {
  it('should search aria-label attribute', async () => {
    const { page, getSource } = createCapturePage();

    const { queryCommands } = await import('../../../src/server/commands/query.js');
    await queryCommands.find!(page, { text: '新建会话' });

    assert.ok(getSource().includes('aria-label'), 'find should search aria-label attribute');
  });

  it('should search title attribute', async () => {
    const { page, getSource } = createCapturePage();

    const { queryCommands } = await import('../../../src/server/commands/query.js');
    await queryCommands.find!(page, { text: 'tooltip text' });

    const src = getSource();
    assert.ok(
      src.includes('title') && src.includes('getAttribute'),
      'find should search title attribute via getAttribute'
    );
  });

  it('should search placeholder attribute', async () => {
    const { page, getSource } = createCapturePage();

    const { queryCommands } = await import('../../../src/server/commands/query.js');
    await queryCommands.find!(page, { text: '搜索会话...' });

    assert.ok(getSource().includes('placeholder'), 'find should search placeholder attribute');
  });
});
