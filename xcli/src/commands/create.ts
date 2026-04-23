import { mkdirSync, writeFileSync, existsSync } from 'fs';

export async function createCommand(args: string[], values: Record<string, any>) {
  const name = values.name || args[0];
  if (!name) {
    console.error('Usage: xcli create --name <case_id>');
    process.exit(1);
  }

  const pluginDir = `.xcli/plugins/${name}`;
  const indexPath = `${pluginDir}/index.ts`;
  const pkgPath = `${pluginDir}/package.json`;

  if (existsSync(pluginDir)) {
    console.error(`Plugin "${name}" already exists at ${pluginDir}`);
    process.exit(1);
  }

  mkdirSync(pluginDir, { recursive: true });

  writeFileSync(
    indexPath,
    `import type { XCLIAPI } from 'xcli';

const BASE_URL = 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice';

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '${name}',
    url: BASE_URL,
  });

  plugin.command('scrape', {
    description: '采集数据',
    parameters: {},
    handler: async (_params: any, ctx: any) => {
      await ctx.page.goto(plugin.url);
      await ctx.page.waitForLoadState('domcontentloaded');
      return { data: [], tips: ['采集完成'] };
    },
  });

  plugin.command('verify', {
    description: '校验数据',
    parameters: {},
    handler: async (_params: any, ctx: any) => {
      return { data: [], errors: [], tips: [] };
    },
  });
}
`
  );

  writeFileSync(
    pkgPath,
    JSON.stringify(
      {
        name,
        version: '1.0.0',
        type: 'module',
      },
      null,
      2
    )
  );

  console.log(`Plugin "${name}" created at ${pluginDir}`);
  console.log(`  - ${indexPath}`);
  console.log(`  - ${pkgPath}`);
}
