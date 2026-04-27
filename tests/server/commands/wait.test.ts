import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import type { Page } from 'playwright-core';

function createWaitPage(): {
  page: Page;
  getLoadStates: () => string[];
  getTimeouts: () => number[];
} {
  const loadStates: string[] = [];
  const timeouts: number[] = [];
  const page = {
    waitForLoadState: mock.fn((state: string) => {
      loadStates.push(state);
      return Promise.resolve();
    }),
    waitForTimeout: mock.fn((ms: number) => {
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

    assert.deepStrictEqual(getLoadStates(), ['networkidle']);
  });

  it('should call waitForTimeout when only timeout is provided', async () => {
    const { page, getTimeouts } = createWaitPage();

    const { evaluateCommands } = await import('../../../src/server/commands/evaluate.js');
    await evaluateCommands.wait!(page, { timeout: 3000 });

    assert.deepStrictEqual(getTimeouts(), [3000]);
  });

  it('should accept state values: load, domcontentloaded, networkidle', async () => {
    const { page, getLoadStates } = createWaitPage();

    const { evaluateCommands } = await import('../../../src/server/commands/evaluate.js');

    for (const state of ['load', 'domcontentloaded', 'networkidle']) {
      await evaluateCommands.wait!(page, { state });
    }

    assert.deepStrictEqual(getLoadStates(), ['load', 'domcontentloaded', 'networkidle']);
  });
});
