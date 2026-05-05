import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

export const refreshCommand: BrowserCommandDefinition = {
  name: 'refresh',
  description: 'Refresh the current page',
  scope: 'page',
  handler: async (_p, ctx) => {
    await ctx.page.reload();
    return ok({ url: ctx.page.url() });
  },
};
