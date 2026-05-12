import { z } from 'zod/v4';
import { ok } from '@dyyz1993/xcli-core';
import { executePageCommand } from '@dyyz1993/xpage';
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
    const result = await executePageCommand(ctx.page, 'mouse', {
      action: p.action,
      x: p.x,
      y: p.y,
      button: p.button,
      steps: p.steps,
    });
    return ok(result);
  },
};
