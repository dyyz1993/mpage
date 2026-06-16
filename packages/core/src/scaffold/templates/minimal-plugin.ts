import type { ScaffoldTemplate } from '../scaffold-engine.js';

export const MINIMAL_PLUGIN_TEMPLATE: ScaffoldTemplate = {
  name: 'minimal-plugin',
  description: 'A minimal xcli plugin with full TypeScript type inference',
  variables: [
    {
      name: 'siteUrl',
      description: 'Target website URL',
      default: '',
    },
  ],
  files: [
    {
      path: 'package.json',
      content: `{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "type": "module"
}`,
    },
    {
      path: 'index.ts',
      content: `import type { XCLIAPI, CommandContext } from '@dyyz1993/xcli-core';
import { z } from 'zod/v4';

export default function (cli: XCLIAPI): void {
  const site = cli.createSite({
    name: '{{projectName}}',
    url: '{{siteUrl}}',
  });

  // ─── Example: type-safe command with Zod inference ───
  //
  // params type is inferred from parameters schema: { name: string }
  // result type is inferred from result schema: { message: string }
  // No manual interface needed — Zod handles everything.
  site.command('hello', {
    description: 'Say hello to someone',
    parameters: z.object({
      name: z.string().default('World').describe('Name to greet'),
    }),
    result: z.object({
      message: z.string(),
    }),
    handler: async (params, ctx) => {
      // params.name  ← string (inferred from z.string())
      // ctx.tips     ← TipCollector (injected by core)
      // ctx.storage  ← StorageContext (persist to ~/.xcli/storage/)

      ctx.tips.info(\`Greeting \${params.name}\`);

      return { message: \`Hello, \${params.name}!\` };
      //     ↑ type-checked against result schema
    },
  });
}
`,
    },
    {
      path: 'README.md',
      content: `# {{projectName}}

A xcli plugin with full TypeScript type inference.

## Type Safety

This plugin demonstrates Zod-powered type inference:
- **params**: inferred from \`parameters\` schema (no manual interface)
- **result**: inferred from \`result\` schema (compile-time + runtime validation)
- **ctx.tips**: structured tips with level (info/warn/error)

## Usage

\`\`\`bash
xcli {{projectName}} hello --name "Alice"
\`\`\`
`,
    },
  ],
};
