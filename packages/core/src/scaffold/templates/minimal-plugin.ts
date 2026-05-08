import type { ScaffoldTemplate } from '../scaffold-engine.js';

export const MINIMAL_PLUGIN_TEMPLATE: ScaffoldTemplate = {
  name: 'minimal-plugin',
  description: 'A minimal xcli plugin',
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
      content: `import type { XCLIAPI } from '@dyyz1993/xcli-core';
import { z } from 'zod';

export default function (cli: XCLIAPI): void {
  const site = cli.createSite({
    name: '{{projectName}}',
    url: '{{siteUrl}}',
  });

  site.command('hello', {
    description: 'Say hello',
    parameters: z.object({
      name: z.string().default('World'),
    }),
    handler: async (params) => {
      return { success: true, data: { message: \`Hello, \${params.name}!\` }, tips: [\`向 \${params.name} 打了招呼\`] };
    },
  });
}
`,
    },
    {
      path: 'README.md',
      content: `# {{projectName}}

A xcli plugin.

## Usage

\`\`\`bash
xcli {{projectName}} hello --name "Alice"
\`\`\`
`,
    },
  ],
};
