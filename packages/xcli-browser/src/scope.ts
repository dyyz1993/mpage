import type { ScopeDefinition } from '@dyyz1993/xcli-core';

export const BROWSER_SCOPE: ScopeDefinition = {
  name: 'browser',
  description: 'Browser automation scope hierarchy',
  levels: [
    { name: 'project', description: 'Project-level (config, daemon)', order: 0 },
    { name: 'browser', description: 'Browser-level (launch, connect)', order: 1 },
    { name: 'page', description: 'Page-level (navigate, scrape)', order: 2 },
    { name: 'element', description: 'Element-level (click, fill)', order: 3 },
  ],
};
