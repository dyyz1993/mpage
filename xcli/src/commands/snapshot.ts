import { snapshotSession } from '../core/session-client';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function snapshotCommand(args: string[], values: Record<string, any>) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  const interactiveOnly = values.interactive === true;

  try {
    const elements = await snapshotSession(session, interactiveOnly);

    const result = {
      data: elements,
      tips: [`Found ${elements.length} elements${interactiveOnly ? ' (interactive only)' : ''}`],
    };

    if (values.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const lines = elements.map((el) => {
        const attrsStr = Object.entries(el.attrs)
          .slice(0, 3)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ');
        return `${el.ref} <${el.tag}> ${attrsStr}`.trim();
      });
      console.log(lines.join('\n'));
      console.log(`\nTips: ${result.tips[0]}`);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}