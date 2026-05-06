export type { Page, Frame } from 'playwright-core';
import type { Page, Frame } from 'playwright-core';

export type PageContext = Page | Frame;

export type CommandHandler = (
  context: PageContext,
  args: Record<string, unknown>
) => Promise<unknown>;

export interface CommandModule {
  [commandName: string]: CommandHandler;
}
