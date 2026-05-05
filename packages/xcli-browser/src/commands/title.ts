import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

export const titleCommand: BrowserCommandDefinition = {
  name: 'title',
  description: 'Get the page title',
  scope: 'page',
  handler: async (_p, ctx) => {
    const title = await ctx.page.title();
    return ok({ title });
  },
};
