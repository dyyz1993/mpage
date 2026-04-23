import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

export async function pluginsCommand(args: string[], _values: Record<string, any>) {
  const pluginsDir = '.xcli/plugins';
  const action = args[0] || 'list';

  if (!existsSync(pluginsDir)) {
    console.log('No plugins installed');
    return;
  }

  if (action === 'list' || action === 'ls') {
    const entries = readdirSync(pluginsDir, { withFileTypes: true });
    const plugins = entries.filter((e) => e.isDirectory());

    if (plugins.length === 0) {
      console.log('No plugins installed');
      console.log('Run "xcli create --name <plugin-id>" to create one');
      return;
    }

    console.log('Installed plugins:');
    for (const plugin of plugins) {
      const pkgPath = join(pluginsDir, plugin.name, 'package.json');
      let version = '1.0.0';
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          version = pkg.version || version;
        } catch {}
      }
      console.log(`  ${plugin.name.padEnd(20)} v${version}`);
    }
    return;
  }

  if (action === 'info') {
    const name = args[1];
    if (!name) {
      console.error('Usage: xcli plugins info <name>');
      return;
    }
    const pluginDir = join(pluginsDir, name);
    if (!existsSync(pluginDir)) {
      console.error(`Plugin "${name}" not found`);
      return;
    }
    const pkgPath = join(pluginDir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      console.log(`${pkg.name}`);
      console.log(`Version: ${pkg.version}`);
      console.log(`Description: ${pkg.description || 'N/A'}`);
    } else {
      console.log(`${name} (no package.json)`);
    }
    return;
  }

  console.log('Usage: xcli plugins <list|info>');
}
