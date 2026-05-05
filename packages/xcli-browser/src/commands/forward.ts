import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

export const forwardCommand: BrowserCommandDefinition = {
  name: 'forward',
  description: 'Go forward in browser history',
  scope: 'page',
  handler: async (_p, ctx) => {
    await ctx.page.goForward();
    return ok({ url: ctx.page.url() });
  },
};
