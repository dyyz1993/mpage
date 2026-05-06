import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
import type { BrowserCommandDefinition } from './command-registry.js';

export const urlCommand: BrowserCommandDefinition = {
  name: 'url',
  description: 'Get the current page URL',
  scope: 'page',
  handler: async (_p, ctx) => {
    const result = await executePageCommand(ctx.page, 'url', {});
    return ok(result);
  },
};
