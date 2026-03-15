import type { Page } from 'playwright-core';
import type { CommandModule } from './types.js';

export const evaluateCommands: CommandModule = {
  evaluate: async (page: Page, args: Record<string, unknown>) => {
    const result = await page.evaluate(args.expression as string);
    return { result };
  },

  wait: async (page: Page, args: Record<string, unknown>) => {
    await page.waitForTimeout(args.timeout as number);
    return { waited: args.timeout };
  },
};
