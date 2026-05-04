import type { Page, Frame } from 'playwright-core';
import type { CommandModule, PageContext } from './types.js';

export const frameCommands: CommandModule = {
  // eslint-disable-next-line require-await
  frames: async (ctx: PageContext) => {
    const page = ctx as Page;
    const frames = page.frames();
    return {
      frames: frames.map((f: Frame, i: number) => ({
        index: i,
        name: f.name() || '',
        url: f.url(),
        isMain: f === page.mainFrame(),
      })),
      count: frames.length,
    };
  },

  // eslint-disable-next-line require-await
  frame: async (ctx: PageContext, args: Record<string, unknown>) => {
    const page = ctx as Page;
    const frames = page.frames();

    let target: Frame | null = null;

    if (args.index !== undefined) {
      const idx = args.index as number;
      target = frames[idx] || null;
    } else if (args.name) {
      target = frames.find((f: Frame) => f.name() === args.name) || null;
    } else if (args.url) {
      const pattern = args.url as string;
      target = frames.find((f: Frame) => f.url().includes(pattern)) || null;
    } else if (args.reset) {
      return { action: 'reset', message: 'Switched back to main frame' };
    }

    if (!target) {
      return { error: 'Frame not found', available: frames.length };
    }

    return {
      action: 'switch',
      name: target.name(),
      url: target.url(),
      index: frames.indexOf(target),
    };
  },
};
