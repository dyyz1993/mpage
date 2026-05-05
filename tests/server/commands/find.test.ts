import { describe, it, expect, vi } from 'vitest';
import type { Page } from 'playwright-core';

function createCapturePage(): { page: Page; getSource: () => string } {
  let source = '';
  const page = {
    evaluate: vi.fn((fn: unknown) => {
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

    expect(getSource().includes('aria-label')).toBeTruthy();
  });

  it('should search title attribute', async () => {
    const { page, getSource } = createCapturePage();

    const { queryCommands } = await import('../../../src/server/commands/query.js');
    await queryCommands.find!(page, { text: 'tooltip text' });

    const src = getSource();
    expect(src.includes('title') && src.includes('getAttribute')).toBeTruthy();
  });

  it('should search placeholder attribute', async () => {
    const { page, getSource } = createCapturePage();

    const { queryCommands } = await import('../../../src/server/commands/query.js');
    await queryCommands.find!(page, { text: '搜索会话...' });

    expect(getSource().includes('placeholder')).toBeTruthy();
  });
});
