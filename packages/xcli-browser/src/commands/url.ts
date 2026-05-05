import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

export const urlCommand: BrowserCommandDefinition = {
  name: 'url',
  description: 'Get the current page URL',
  scope: 'page',
  // eslint-disable-next-line require-await
  handler: async (_p, ctx) => {
    return ok({ url: ctx.page.url() });
  },
};
