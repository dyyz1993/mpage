import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  width: z.number().optional().describe('Viewport width'),
  height: z.number().optional().describe('Viewport height'),
  deviceScaleFactor: z.number().optional().describe('Device scale factor'),
  isMobile: z.boolean().default(false).describe('Mobile viewport'),
  hasTouch: z.boolean().default(false).describe('Touch support'),
  userAgent: z.string().optional().describe('User agent string'),
});

export const setViewportCommand: BrowserCommandDefinition<typeof params> = {
  name: 'setViewport',
  description: 'Set the viewport size and properties',
  scope: 'browser',
  parameters: params,
  handler: async (p, ctx) => {
    const viewport = ctx.page.viewportSize();
    await ctx.page.setViewportSize({
      width: p.width ?? viewport?.width ?? 1280,
      height: p.height ?? viewport?.height ?? 720,
    });
    if (p.userAgent) {
      await ctx.browserContext.setExtraHTTPHeaders({});
      await ctx.page.context().clearCookies();
    }
    return ok({
      width: p.width ?? viewport?.width ?? 1280,
      height: p.height ?? viewport?.height ?? 720,
    });
  },
};
