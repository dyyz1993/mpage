import type { ScopeDefinition, ScopeLevel, ScopeConfig } from './scope.js';

export interface ScopedCommand {
  name: string;
  scope: string;
  config: ScopeConfig;
}

export class ScopeRegistry {
  private scopes: Map<string, ScopeDefinition> = new Map();
  private commandScopeMap: Map<string, Map<string, ScopedCommand>> = new Map();

  registerScope(definition: ScopeDefinition): void {
    this.scopes.set(definition.name, definition);
  }

  getScope(name: string): ScopeDefinition | undefined {
    return this.scopes.get(name);
  }

  registerCommand(siteName: string, command: ScopedCommand): ScopedCommand | null {
    if (!this.commandScopeMap.has(siteName)) {
      this.commandScopeMap.set(siteName, new Map());
    }
    const siteCommands = this.commandScopeMap.get(siteName)!;

    const existing = siteCommands.get(command.name);
    if (existing) {
      if (!existing.config.canOverride) {
        return null;
      }

      if (
        existing.config.overrideTargets &&
        existing.config.overrideTargets.length > 0 &&
        !existing.config.overrideTargets.includes(command.scope)
      ) {
        return null;
      }
    }

    siteCommands.set(command.name, command);
    return command;
  }

  getCommandScope(siteName: string, commandName: string): ScopedCommand | undefined {
    return this.commandScopeMap.get(siteName)?.get(commandName);
  }

  resolveCommand(
    siteName: string,
    commandName: string,
    _currentScope: string
  ): ScopedCommand | undefined {
    const siteCommands = this.commandScopeMap.get(siteName);
    if (!siteCommands) return undefined;

    return siteCommands.get(commandName);
  }

  listCommands(siteName: string, scopeLevel?: string): ScopedCommand[] {
    const siteCommands = this.commandScopeMap.get(siteName);
    if (!siteCommands) return [];

    let commands = Array.from(siteCommands.values());
    if (scopeLevel) {
      commands = commands.filter((c) => c.scope === scopeLevel);
    }
    return commands;
  }

  getScopeForSite(siteName: string): ScopeDefinition | undefined {
    void siteName;
    return this.scopes.values().next().value;
  }

  isValidScopeLevel(scopeName: string, levelName: string): boolean {
    const scope = this.scopes.get(scopeName);
    if (!scope) return false;
    return scope.levels.some((l) => l.name === levelName);
  }

  getSortedLevels(scopeName: string): ScopeLevel[] {
    const scope = this.scopes.get(scopeName);
    if (!scope) return [];
    return [...scope.levels].sort((a, b) => a.order - b.order);
  }
}
