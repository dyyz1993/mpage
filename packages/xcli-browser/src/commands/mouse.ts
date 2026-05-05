import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  action: z.enum(['move', 'down', 'up', 'click', 'dblclick']).describe('Mouse action'),
  x: z.number().default(0).describe('X coordinate'),
  y: z.number().default(0).describe('Y coordinate'),
  button: z.enum(['left', 'right', 'middle']).default('left').describe('Mouse button'),
  steps: z.number().default(1).describe('Steps for move action'),
});

export const mouseCommand: BrowserCommandDefinition<typeof params> = {
  name: 'mouse',
  description: 'Control the mouse (move, click, etc.)',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    switch (p.action) {
      case 'move':
        await ctx.page.mouse.move(p.x, p.y, { steps: p.steps });
        break;
      case 'down':
        await ctx.page.mouse.down({ button: p.button });
        break;
      case 'up':
        await ctx.page.mouse.up({ button: p.button });
        break;
      case 'click':
        await ctx.page.mouse.click(p.x, p.y, { button: p.button });
        break;
      case 'dblclick':
        await ctx.page.mouse.dblclick(p.x, p.y, { button: p.button });
        break;
    }
    return ok({ action: p.action, x: p.x, y: p.y });
  },
};
