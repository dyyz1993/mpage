import { describe, it, expect } from 'vitest';
import { ScopeRegistry } from '../../src/command/scope-registry.js';
import type { ScopedCommand } from '../../src/command/scope-registry.js';
import type { ScopeDefinition, ScopeConfig } from '../../src/command/scope.js';

function makeScope(levels?: string[]): ScopeDefinition {
  return {
    name: 'test-scope',
    description: 'Test scope',
    levels: levels?.map((name, i) => ({ name, description: `${name} level`, order: i })) ?? [
      { name: 'project', description: 'Project', order: 0 },
      { name: 'module', description: 'Module', order: 1 },
      { name: 'resource', description: 'Resource', order: 2 },
      { name: 'action', description: 'Action', order: 3 },
    ],
  };
}

function makeCommand(
  name: string,
  scope: string,
  configOverrides?: Partial<ScopeConfig>
): ScopedCommand {
  return {
    name,
    scope,
    config: {
      current: scope,
      canOverride: true,
      ...configOverrides,
    },
  };
}

describe('ScopeRegistry', () => {
  describe('registerScope()', () => {
    it('should register a custom scope', () => {
      const registry = new ScopeRegistry();
      const scope = makeScope();
      registry.registerScope(scope);
      expect(registry.getScope('test-scope')).toBe(scope);
    });

    it('should overwrite scope with same name', () => {
      const registry = new ScopeRegistry();
      const scope1 = makeScope();
      const scope2: ScopeDefinition = {
        ...makeScope(),
        description: 'Updated',
      };
      registry.registerScope(scope1);
      registry.registerScope(scope2);
      expect(registry.getScope('test-scope')!.description).toBe('Updated');
    });
  });

  describe('getScope()', () => {
    it('should return undefined for non-existent scope', () => {
      const registry = new ScopeRegistry();
      expect(registry.getScope('nope')).toBeUndefined();
    });
  });

  describe('registerCommand()', () => {
    it('should register command and return it', () => {
      const registry = new ScopeRegistry();
      const cmd = makeCommand('scrape', 'page');
      const result = registry.registerCommand('mysite', cmd);
      expect(result).toBe(cmd);
    });

    it('should reject override when canOverride is false', () => {
      const registry = new ScopeRegistry();
      registry.registerCommand('site', makeCommand('cmd', 'page', { canOverride: false }));
      const result = registry.registerCommand('site', makeCommand('cmd', 'element'));
      expect(result).toBeNull();
      expect(registry.getCommandScope('site', 'cmd')!.scope).toBe('page');
    });

    it('should reject override when scope not in overrideTargets', () => {
      const registry = new ScopeRegistry();
      registry.registerCommand(
        'site',
        makeCommand('cmd', 'page', { overrideTargets: ['browser'] })
      );
      const result = registry.registerCommand('site', makeCommand('cmd', 'element'));
      expect(result).toBeNull();
    });

    it('should allow override when scope is in overrideTargets', () => {
      const registry = new ScopeRegistry();
      registry.registerCommand(
        'site',
        makeCommand('cmd', 'page', { overrideTargets: ['element', 'browser'] })
      );
      const newCmd = makeCommand('cmd', 'element');
      const result = registry.registerCommand('site', newCmd);
      expect(result).toBe(newCmd);
      expect(registry.getCommandScope('site', 'cmd')!.scope).toBe('element');
    });

    it('should allow override when overrideTargets is empty', () => {
      const registry = new ScopeRegistry();
      registry.registerCommand('site', makeCommand('cmd', 'page', { overrideTargets: [] }));
      const result = registry.registerCommand('site', makeCommand('cmd', 'element'));
      expect(result).not.toBeNull();
    });

    it('should isolate commands across sites', () => {
      const registry = new ScopeRegistry();
      registry.registerCommand('site-a', makeCommand('cmd', 'page'));
      registry.registerCommand('site-b', makeCommand('cmd', 'element'));
      expect(registry.getCommandScope('site-a', 'cmd')!.scope).toBe('page');
      expect(registry.getCommandScope('site-b', 'cmd')!.scope).toBe('element');
    });
  });

  describe('getCommandScope()', () => {
    it('should return undefined for non-existent site', () => {
      const registry = new ScopeRegistry();
      expect(registry.getCommandScope('no-site', 'cmd')).toBeUndefined();
    });

    it('should return undefined for non-existent command', () => {
      const registry = new ScopeRegistry();
      registry.registerCommand('site', makeCommand('cmd', 'page'));
      expect(registry.getCommandScope('site', 'other')).toBeUndefined();
    });
  });

  describe('resolveCommand()', () => {
    it('should resolve command by site and name', () => {
      const registry = new ScopeRegistry();
      const cmd = makeCommand('scrape', 'page');
      registry.registerCommand('mysite', cmd);
      expect(registry.resolveCommand('mysite', 'scrape', 'page')).toBe(cmd);
    });

    it('should return undefined for non-existent site', () => {
      const registry = new ScopeRegistry();
      expect(registry.resolveCommand('x', 'y', 'page')).toBeUndefined();
    });

    it('should return undefined for non-existent command', () => {
      const registry = new ScopeRegistry();
      registry.registerCommand('site', makeCommand('a', 'page'));
      expect(registry.resolveCommand('site', 'b', 'page')).toBeUndefined();
    });
  });

  describe('listCommands()', () => {
    it('should list all commands for a site', () => {
      const registry = new ScopeRegistry();
      registry.registerCommand('site', makeCommand('a', 'page'));
      registry.registerCommand('site', makeCommand('b', 'element'));
      expect(registry.listCommands('site')).toHaveLength(2);
    });

    it('should filter by scope level', () => {
      const registry = new ScopeRegistry();
      registry.registerCommand('site', makeCommand('a', 'page'));
      registry.registerCommand('site', makeCommand('b', 'element'));
      const filtered = registry.listCommands('site', 'page');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('a');
    });

    it('should return empty for non-existent site', () => {
      const registry = new ScopeRegistry();
      expect(registry.listCommands('nope')).toEqual([]);
    });
  });

  describe('getScopeForSite()', () => {
    it('should return the first registered scope', () => {
      const registry = new ScopeRegistry();
      const scope = makeScope();
      registry.registerScope(scope);
      expect(registry.getScopeForSite('any')).toBe(scope);
    });

    it('should return undefined when no scopes registered', () => {
      const registry = new ScopeRegistry();
      expect(registry.getScopeForSite('any')).toBeUndefined();
    });
  });

  describe('isValidScopeLevel()', () => {
    it('should return true for valid scope level', () => {
      const registry = new ScopeRegistry();
      registry.registerScope(makeScope(['project', 'module', 'resource', 'action']));
      expect(registry.isValidScopeLevel('test-scope', 'project')).toBe(true);
      expect(registry.isValidScopeLevel('test-scope', 'action')).toBe(true);
    });

    it('should return false for invalid scope level', () => {
      const registry = new ScopeRegistry();
      registry.registerScope(makeScope());
      expect(registry.isValidScopeLevel('test-scope', 'nonexistent')).toBe(false);
    });

    it('should return false for non-existent scope', () => {
      const registry = new ScopeRegistry();
      expect(registry.isValidScopeLevel('nope', 'project')).toBe(false);
    });
  });

  describe('getSortedLevels()', () => {
    it('should return levels sorted by order', () => {
      const registry = new ScopeRegistry();
      registry.registerScope({
        name: 'test-scope',
        description: '',
        levels: [
          { name: 'action', description: '', order: 3 },
          { name: 'project', description: '', order: 0 },
          { name: 'resource', description: '', order: 2 },
          { name: 'module', description: '', order: 1 },
        ],
      });
      const sorted = registry.getSortedLevels('test-scope');
      expect(sorted.map((l) => l.name)).toEqual(['project', 'module', 'resource', 'action']);
    });

    it('should return empty for non-existent scope', () => {
      const registry = new ScopeRegistry();
      expect(registry.getSortedLevels('nope')).toEqual([]);
    });
  });
});
