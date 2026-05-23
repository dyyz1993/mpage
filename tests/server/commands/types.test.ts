import { describe, it, expect } from 'vitest';
import {
  getCommandHandler,
  hasCommand,
  pageCommandHandlers,
} from '../../../src/server/commands/index.js';
import { navigationCommands } from '../../../src/server/commands/navigation.js';
import { interactionCommands } from '../../../src/server/commands/interaction.js';
import { queryCommands } from '../../../src/server/commands/query.js';
import { snapshotCommands } from '../../../src/server/commands/snapshot.js';
import { evaluateCommands } from '../../../src/server/commands/evaluate.js';
import { frameCommands } from '../../../src/server/commands/frame.js';
import { commands } from '../../../src/commands/definitions.js';

const allModuleCommands: Record<string, Record<string, unknown>> = {
  navigation: navigationCommands,
  interaction: interactionCommands,
  query: queryCommands,
  snapshot: snapshotCommands,
  evaluate: evaluateCommands,
  frame: frameCommands,
};

describe('server/commands/types and registry', () => {
  describe('command registry completeness', () => {
    it('should have handlers for all module commands', () => {
      for (const [, moduleCommands] of Object.entries(allModuleCommands)) {
        for (const cmdName of Object.keys(moduleCommands)) {
          expect(hasCommand(cmdName)).toBeTruthy();
        }
      }
    });

    it('should have all module commands in pageCommandHandlers', () => {
      for (const [, moduleCommands] of Object.entries(allModuleCommands)) {
        for (const cmdName of Object.keys(moduleCommands)) {
          expect(cmdName in pageCommandHandlers).toBeTruthy();
        }
      }
    });

    it('should have handler functions for all registered commands', () => {
      for (const cmdName of Object.keys(pageCommandHandlers)) {
        const handler = getCommandHandler(cmdName);
        expect(typeof handler).toBe('function');
      }
    });
  });

  describe('command definitions vs handlers alignment', () => {
    it('every defined command should have a page command handler', () => {
      const definitionNames = Object.keys(commands);
      for (const name of definitionNames) {
        expect(hasCommand(name)).toBeTruthy();
      }
    });

    it('every page command handler should have a definition or be server-only', () => {
      const serverOnlyCommands = new Set([
        'goBack',
        'goForward',
        'reload',
        'viewport',
        'screenshotBase64',
        'evaluateRaw',
        'wait',
        'getAttribute',
        'select',
        'check',
        'waitForSelector',
        'inputValue',
        'textContent',
      ]);
      const aliases: Record<string, string> = {
        findByText: 'find',
        waitForTimeout: 'wait',
      };
      for (const name of Object.keys(pageCommandHandlers)) {
        const inDefs = name in commands;
        const isAliasTarget = Object.values(aliases).includes(name);
        const isServerOnly = serverOnlyCommands.has(name);
        expect(inDefs || isAliasTarget || isServerOnly).toBeTruthy();
      }
    });
  });

  describe('aliases', () => {
    it('findByText should resolve to find handler', () => {
      const aliasHandler = getCommandHandler('findByText');
      const directHandler = getCommandHandler('find');
      expect(aliasHandler).toBe(directHandler);
    });

    it('waitForTimeout should resolve to wait handler', () => {
      const aliasHandler = getCommandHandler('waitForTimeout');
      const directHandler = getCommandHandler('wait');
      expect(aliasHandler).toBe(directHandler);
    });

    it('unknown alias should return null', () => {
      const handler = getCommandHandler('nonExistentAlias');
      expect(handler).toBeNull();
    });
  });

  describe('command handler types', () => {
    it('all handlers should be async functions', () => {
      for (const [, handler] of Object.entries(pageCommandHandlers)) {
        expect(handler.constructor.name).toBe('AsyncFunction');
      }
    });
  });

  describe('module command counts', () => {
    const expectedCounts: Record<string, number> = {
      navigation: Object.keys(navigationCommands).length,
      interaction: Object.keys(interactionCommands).length,
      query: Object.keys(queryCommands).length,
      snapshot: Object.keys(snapshotCommands).length,
      evaluate: Object.keys(evaluateCommands).length,
      frame: Object.keys(frameCommands).length,
    };

    it('total handlers should equal sum of module handlers', () => {
      const total = Object.values(expectedCounts).reduce((a, b) => a + b, 0);
      expect(Object.keys(pageCommandHandlers).length).toBe(total);
    });

    it('each module should have at least one command', () => {
      for (const [, count] of Object.entries(expectedCounts)) {
        expect(count > 0).toBeTruthy();
      }
    });
  });
});
