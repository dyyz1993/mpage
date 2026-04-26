import type { Page } from 'playwright-core';
import type { CommandModule } from './types.js';

export const interactionCommands: CommandModule = {
  click: async (page: Page, args: Record<string, unknown>) => {
    await page.click(args.selector as string, args as Record<string, unknown>);
    return { selector: args.selector };
  },

  fill: async (page: Page, args: Record<string, unknown>) => {
    await page.fill(args.selector as string, args.value as string, args as Record<string, unknown>);
    return { selector: args.selector, value: args.value };
  },

  type: async (page: Page, args: Record<string, unknown>) => {
    await page.type(args.selector as string, args.text as string, {
      timeout: (args.timeout as number) || 10000,
      ...args,
    });
    return { selector: args.selector, text: args.text };
  },

  press: async (page: Page, args: Record<string, unknown>) => {
    await page.press(args.selector as string, args.key as string, args as Record<string, unknown>);
    return { key: args.key };
  },

  hover: async (page: Page, args: Record<string, unknown>) => {
    await page.hover(args.selector as string, args as Record<string, unknown>);
    return { selector: args.selector };
  },

  scroll: async (page: Page, args: Record<string, unknown>) => {
    if (args.selector) {
      await page.locator(args.selector as string).scrollIntoViewIfNeeded();
      return { scrolledTo: args.selector };
    }
    await page.evaluate(`window.scrollTo(${args.x ?? 0}, ${args.y ?? 0})`);
    return { x: args.x ?? 0, y: args.y ?? 0 };
  },

  select: async (page: Page, args: Record<string, unknown>) => {
    await page.selectOption(args.selector as string, args.value as string);
    return { selector: args.selector, value: args.value };
  },

  check: async (page: Page, args: Record<string, unknown>) => {
    await page.check(args.selector as string);
    return { selector: args.selector };
  },

  waitForSelector: async (page: Page, args: Record<string, unknown>) => {
    await page.waitForSelector(args.selector as string, {
      timeout: (args.timeout as number) || 30000,
    });
    return { selector: args.selector };
  },
};
