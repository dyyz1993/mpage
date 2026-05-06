import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().describe('Selector to wait for'),
  state: z
    .enum(['attached', 'detached', 'visible', 'hidden'])
    .default('visible')
    .describe('Element state to wait for'),
  timeout: z.number().default(30000).describe('Maximum wait time (ms)'),
});

export const waitForSelectorCommand: BrowserCommandDefinition<typeof params> = {
  name: 'waitForSelector',
  description: 'Wait for an element to appear on the page',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    const result = await executePageCommand(ctx.page, 'waitForSelector', {
      selector: p.selector,
      state: p.state,
      timeout: p.timeout,
    });
    return ok(result);
  },
};
