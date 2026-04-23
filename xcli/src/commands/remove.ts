import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const GLOBAL_PLUGINS_DIR = join(homedir(), '.xcli', 'plugins');
const LOCAL_PLUGINS_DIR = '.xcli/plugins';

export async function removeCommand(args: string[], values: Record<string, any>) {
  const isGlobal = values.global || values.g || (!values.project && !values.p);
  const name = args[0];

  if (!name) {
    console.error('Usage: xcli remove <name> [--global|--project]');
    console.error('');
    console.error('Flags:');
    console.error('  -g, --global    卸载全局插件 (默认)');
    console.error('  -p, --project  卸载本地插件');
    process.exit(1);
  }

  const pluginsDir = isGlobal ? GLOBAL_PLUGINS_DIR : LOCAL_PLUGINS_DIR;
  const targetDir = join(pluginsDir, name);
  const location = isGlobal ? '[global]' : '[local]';

  if (!existsSync(targetDir)) {
    if (isGlobal) {
      const localTarget = join(LOCAL_PLUGINS_DIR, name);
      if (existsSync(localTarget)) {
        rmSync(localTarget, { recursive: true, force: true });
        console.log(`Removed: ${name} [local]`);
        return;
      }
    }
    console.error(`Plugin "${name}" not found`);
    process.exit(1);
  }

  rmSync(targetDir, { recursive: true, force: true });
  console.log(`Removed: ${name} ${location}`);
}
