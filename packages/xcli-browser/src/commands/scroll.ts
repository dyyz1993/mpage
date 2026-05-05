import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().optional().describe('Element to scroll'),
  direction: z.enum(['up', 'down', 'left', 'right']).default('down').describe('Scroll direction'),
  distance: z.number().default(500).describe('Scroll distance in pixels'),
});

export const scrollCommand: BrowserCommandDefinition<typeof params> = {
  name: 'scroll',
  description: 'Scroll the page or an element',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    if (p.selector) {
      const element = ctx.page.locator(p.selector).first();
      if (p.direction === 'down') {
        await element.evaluate((el, d) => el.scrollBy(0, d as number), p.distance);
      } else if (p.direction === 'up') {
        await element.evaluate((el, d) => el.scrollBy(0, -(d as number)), p.distance);
      } else if (p.direction === 'right') {
        await element.evaluate((el, d) => el.scrollBy(d as number, 0), p.distance);
      } else {
        await element.evaluate((el, d) => el.scrollBy(-(d as number), 0), p.distance);
      }
    } else {
      if (p.direction === 'down') {
        await ctx.page.mouse.wheel(0, p.distance);
      } else if (p.direction === 'up') {
        await ctx.page.mouse.wheel(0, -p.distance);
      } else if (p.direction === 'right') {
        await ctx.page.mouse.wheel(p.distance, 0);
      } else {
        await ctx.page.mouse.wheel(-p.distance, 0);
      }
    }
    return ok({ direction: p.direction, distance: p.distance });
  },
};
