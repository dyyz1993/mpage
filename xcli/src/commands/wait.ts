import { waitForSelector, waitForTimeout } from '../core/session-client';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function waitCommand(args: string[], values: Record<string, any>) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  let timeout = 30000;
  let selector: string | undefined;

  if (args.length > 0) {
    const firstArg = args[0];
    if (firstArg.startsWith('@')) {
      selector = firstArg;
    } else if (/^\d+$/.test(firstArg)) {
      timeout = parseInt(firstArg, 10);
    }
  }

  if (values.selector) {
    selector = values.selector as string;
  }

  try {
    if (selector) {
      const found = await waitForSelector(session, selector, timeout);
      console.log(JSON.stringify({ found, selector }, null, 2));
    } else {
      await waitForTimeout(session, timeout);
      console.log(JSON.stringify({ waited: timeout }, null, 2));
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
