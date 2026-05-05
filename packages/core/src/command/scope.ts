export interface ScopeDefinition {
  name: string;
  description: string;
  levels: ScopeLevel[];
}

export interface ScopeLevel {
  name: string;
  description: string;
  order: number;
}

export interface ScopeConfig {
  current: string;
  overrideTargets?: string[];
  canOverride?: boolean;
}

export const DEFAULT_SCOPE: ScopeDefinition = {
  name: 'default',
  description: 'Default scope hierarchy',
  levels: [
    { name: 'project', description: 'Project-level operations', order: 0 },
    { name: 'module', description: 'Module-level operations', order: 1 },
    { name: 'resource', description: 'Resource-level operations', order: 2 },
    { name: 'action', description: 'Action-level operations', order: 3 },
  ],
};
