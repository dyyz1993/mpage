import { describe, it } from 'node:test';
import assert from 'node:assert';
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
import { commands } from '../../../src/commands/definitions.js';

const allModuleCommands: Record<string, Record<string, unknown>> = {
  navigation: navigationCommands,
  interaction: interactionCommands,
  query: queryCommands,
  snapshot: snapshotCommands,
  evaluate: evaluateCommands,
};

describe('server/commands/types and registry', () => {
  describe('command registry completeness', () => {
    it('should have handlers for all module commands', () => {
      for (const [moduleName, moduleCommands] of Object.entries(allModuleCommands)) {
        for (const cmdName of Object.keys(moduleCommands)) {
          assert.ok(
            hasCommand(cmdName),
            `Command '${cmdName}' from module '${moduleName}' not found in registry`
          );
        }
      }
    });

    it('should have all module commands in pageCommandHandlers', () => {
      for (const [moduleName, moduleCommands] of Object.entries(allModuleCommands)) {
        for (const cmdName of Object.keys(moduleCommands)) {
          assert.ok(
            cmdName in pageCommandHandlers,
            `Command '${cmdName}' from '${moduleName}' missing from pageCommandHandlers`
          );
        }
      }
    });

    it('should have handler functions for all registered commands', () => {
      for (const cmdName of Object.keys(pageCommandHandlers)) {
        const handler = getCommandHandler(cmdName);
        assert.strictEqual(
          typeof handler,
          'function',
          `Handler for '${cmdName}' is not a function`
        );
      }
    });
  });

  describe('command definitions vs handlers alignment', () => {
    it('every defined command should have a page command handler', () => {
      const definitionNames = Object.keys(commands);
      for (const name of definitionNames) {
        assert.ok(hasCommand(name), `Defined command '${name}' has no page command handler`);
      }
    });

    it('every page command handler should have a definition or be server-only', () => {
      const serverOnlyCommands = new Set([
        'goBack',
        'goForward',
        'reload',
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
        assert.ok(
          inDefs || isAliasTarget || isServerOnly,
          `Page command '${name}' has no definition and is not an alias target`
        );
      }
    });
  });

  describe('aliases', () => {
    it('findByText should resolve to find handler', () => {
      const aliasHandler = getCommandHandler('findByText');
      const directHandler = getCommandHandler('find');
      assert.strictEqual(aliasHandler, directHandler);
    });

    it('waitForTimeout should resolve to wait handler', () => {
      const aliasHandler = getCommandHandler('waitForTimeout');
      const directHandler = getCommandHandler('wait');
      assert.strictEqual(aliasHandler, directHandler);
    });

    it('unknown alias should return null', () => {
      const handler = getCommandHandler('nonExistentAlias');
      assert.strictEqual(handler, null);
    });
  });

  describe('command handler types', () => {
    it('all handlers should be async functions', () => {
      for (const [name, handler] of Object.entries(pageCommandHandlers)) {
        assert.strictEqual(
          handler.constructor.name,
          'AsyncFunction',
          `Handler '${name}' is not async`
        );
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
    };

    it('total handlers should equal sum of module handlers', () => {
      const total = Object.values(expectedCounts).reduce((a, b) => a + b, 0);
      assert.strictEqual(Object.keys(pageCommandHandlers).length, total);
    });

    it('each module should have at least one command', () => {
      for (const [name, count] of Object.entries(expectedCounts)) {
        assert.ok(count > 0, `Module '${name}' has no commands`);
      }
    });
  });
});
