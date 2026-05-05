import { describe, it, expect, vi } from 'vitest';
import type { Page } from 'playwright-core';

function createWaitPage(): {
  page: Page;
  getLoadStates: () => string[];
  getTimeouts: () => number[];
} {
  const loadStates: string[] = [];
  const timeouts: number[] = [];
  const page = {
    waitForLoadState: vi.fn((state: string) => {
      loadStates.push(state);
      return Promise.resolve();
    }),
    waitForTimeout: vi.fn((ms: number) => {
      timeouts.push(ms);
      return Promise.resolve();
    }),
  } as unknown as Page;
  return { page, getLoadStates: () => loadStates, getTimeouts: () => timeouts };
}

describe('wait command', () => {
  it('should call waitForLoadState when state is provided', async () => {
    const { page, getLoadStates } = createWaitPage();

    const { evaluateCommands } = await import('../../../src/server/commands/evaluate.js');
    await evaluateCommands.wait!(page, { state: 'networkidle' });

    expect(getLoadStates()).toStrictEqual(['networkidle']);
  });

  it('should call waitForTimeout when only timeout is provided', async () => {
    const { page, getTimeouts } = createWaitPage();

    const { evaluateCommands } = await import('../../../src/server/commands/evaluate.js');
    await evaluateCommands.wait!(page, { timeout: 3000 });

    expect(getTimeouts()).toStrictEqual([3000]);
  });

  it('should accept state values: load, domcontentloaded, networkidle', async () => {
    const { page, getLoadStates } = createWaitPage();

    const { evaluateCommands } = await import('../../../src/server/commands/evaluate.js');

    for (const state of ['load', 'domcontentloaded', 'networkidle']) {
      await evaluateCommands.wait!(page, { state });
    }

    expect(getLoadStates()).toStrictEqual(['load', 'domcontentloaded', 'networkidle']);
  });
});
