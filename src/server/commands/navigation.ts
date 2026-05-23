import type { Page, Frame } from 'playwright-core';
import type { CommandModule, PageContext } from './types.js';

function getUrl(ctx: PageContext): string {
  if ((ctx as Page).url) return (ctx as Page).url();
  return (ctx as Frame).url();
}

export const navigationCommands: CommandModule = {
  goto: async (ctx: PageContext, args: Record<string, unknown>) => {
    const page = ctx as Page;
    await page.goto(args.url as string, {
      waitUntil: (args.waitUntil as 'load' | 'domcontentloaded' | 'networkidle') || 'load',
      timeout: (args.timeout as number) || 30000,
    });
    return { url: getUrl(page) };
  },

  goBack: async (ctx: PageContext) => {
    const page = ctx as Page;
    await page.goBack();
    return { url: getUrl(page) };
  },

  goForward: async (ctx: PageContext) => {
    const page = ctx as Page;
    await page.goForward();
    return { url: getUrl(page) };
  },

  reload: async (ctx: PageContext) => {
    const page = ctx as Page;
    await page.reload();
    return { url: getUrl(page) };
  },

  title: async (ctx: PageContext) => {
    const title = await ctx.title();
    return { title };
  },

  // eslint-disable-next-line require-await
  url: async (ctx: PageContext) => {
    return { url: getUrl(ctx) };
  },

  // eslint-disable-next-line require-await
  viewport: async (ctx: PageContext) => {
    const page = ctx as Page;
    const vp = page.viewportSize();
    return { width: vp?.width ?? 0, height: vp?.height ?? 0 };
  },
};
