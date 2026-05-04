import type { Page, Frame } from 'playwright-core';
import type { CommandHandler, CommandModule, PageContext } from './types.js';
import { navigationCommands } from './navigation.js';
import { interactionCommands } from './interaction.js';
import { queryCommands } from './query.js';
import { snapshotCommands } from './snapshot.js';
import { evaluateCommands } from './evaluate.js';
import { frameCommands } from './frame.js';

const allCommands: CommandModule = {
  ...navigationCommands,
  ...interactionCommands,
  ...queryCommands,
  ...snapshotCommands,
  ...evaluateCommands,
  ...frameCommands,
};

const aliases: Record<string, string> = {
  findByText: 'find',
  waitForTimeout: 'wait',
};

export function getCommandHandler(commandName: string): CommandHandler | null {
  const resolvedName = aliases[commandName] || commandName;
  return allCommands[resolvedName] || null;
}

export function hasCommand(commandName: string): boolean {
  const resolvedName = aliases[commandName] || commandName;
  return resolvedName in allCommands;
}

export function executePageCommand(
  page: Page,
  commandName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const handler = getCommandHandler(commandName);
  if (!handler) {
    throw new Error(`Unknown command: ${commandName}`);
  }

  const frameRef = args.frame;
  delete args.frame;

  let context: PageContext = page;
  if (frameRef !== undefined) {
    const frames = page.frames();
    if (typeof frameRef === 'number') {
      context = frames[frameRef] || page;
    } else if (typeof frameRef === 'string') {
      context =
        frames.find((f: Frame) => f.url().includes(frameRef)) ||
        frames.find((f: Frame) => f.name() === frameRef) ||
        page;
    }
  }

  return Promise.resolve(handler(context, args));
}

export { navigationCommands } from './navigation.js';
export { interactionCommands } from './interaction.js';
export { queryCommands } from './query.js';
export { snapshotCommands } from './snapshot.js';
export { evaluateCommands } from './evaluate.js';
export { STRUCTURE_EXTRACTOR_CODE } from './structure-extractor.js';
export type { CommandHandler, CommandModule } from './types.js';
export { allCommands as pageCommandHandlers };
