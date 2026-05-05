import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

export const backCommand: BrowserCommandDefinition = {
  name: 'back',
  description: 'Go back in browser history',
  scope: 'page',
  handler: async (_p, ctx) => {
    await ctx.page.goBack();
    return ok({ url: ctx.page.url() });
  },
};
