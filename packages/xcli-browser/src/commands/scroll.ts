import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
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
      const result = await executePageCommand(ctx.page, 'scroll', {
        selector: p.selector,
      });
      return ok({
        selector: p.selector,
        direction: p.direction,
        distance: p.distance,
        ...(result as Record<string, unknown>),
      });
    }
    const dir = p.direction;
    const dist = p.distance;
    let x = 0;
    let y = 0;
    if (dir === 'up') y = -dist;
    else if (dir === 'down') y = dist;
    else if (dir === 'left') x = -dist;
    else x = dist;
    const result = await executePageCommand(ctx.page, 'scroll', { x, y });
    return ok({
      direction: p.direction,
      distance: p.distance,
      ...(result as Record<string, unknown>),
    });
  },
};
