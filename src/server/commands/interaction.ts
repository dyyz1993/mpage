import type { PageContext } from './types.js';
import type { CommandModule } from './types.js';

export const interactionCommands: CommandModule = {
  click: async (context: PageContext, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const options: Record<string, unknown> = {};
    if (args.timeout !== undefined) options.timeout = args.timeout;
    if (args.force !== undefined) options.force = args.force;
    await context.waitForSelector(selector, { timeout: (args.timeout as number) || 10000 });
    await context.click(selector, options);
    return { selector };
  },

  fill: async (context: PageContext, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const value = args.value as string;
    const options: Record<string, unknown> = {};
    if (args.timeout !== undefined) options.timeout = args.timeout;
    await context.waitForSelector(selector, { timeout: (args.timeout as number) || 10000 });
    await context.fill(selector, value, options);
    await context.evaluate((sel: string) => {
      const el = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, selector);
    return { selector, value };
  },

  type: async (context: PageContext, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const text = args.text as string;
    const options: Record<string, unknown> = {};
    if (args.timeout !== undefined) options.timeout = args.timeout;
    if (args.delay !== undefined) options.delay = args.delay;
    await context.type(selector, text, options);
    return { selector, text };
  },

  press: async (context: PageContext, args: Record<string, unknown>) => {
    const key = args.key as string;
    const selector = (args.selector as string) || 'body';
    const options: Record<string, unknown> = {};
    if (args.delay !== undefined) options.delay = args.delay;
    await context.press(selector, key, options);
    return { key, selector };
  },

  hover: async (context: PageContext, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const options: Record<string, unknown> = {};
    if (args.timeout !== undefined) options.timeout = args.timeout;
    await context.hover(selector, options);
    return { selector };
  },

  scroll: async (context: PageContext, args: Record<string, unknown>) => {
    if (args.selector) {
      await context.locator(args.selector as string).scrollIntoViewIfNeeded();
      return { scrolledTo: args.selector };
    }
    await context.evaluate(`window.scrollTo(${args.x ?? 0}, ${args.y ?? 0})`);
    return { x: args.x ?? 0, y: args.y ?? 0 };
  },

  select: async (context: PageContext, args: Record<string, unknown>) => {
    await context.waitForSelector(args.selector as string, { timeout: 10000 });
    await context.selectOption(args.selector as string, args.value as string);
    return { selector: args.selector, value: args.value };
  },

  check: async (context: PageContext, args: Record<string, unknown>) => {
    await context.waitForSelector(args.selector as string, { timeout: 10000 });
    await context.check(args.selector as string);
    return { selector: args.selector };
  },

  waitForSelector: async (context: PageContext, args: Record<string, unknown>) => {
    await context.waitForSelector(args.selector as string, {
      timeout: (args.timeout as number) || 30000,
    });
    return { selector: args.selector };
  },
};
