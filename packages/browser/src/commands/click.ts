import { clickSession } from '@xcli/session';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandValues } from '@xcli/core';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function clickCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  const selector = args[0] || (values.ref as string);
  if (!selector) {
    console.error('Error: Selector or ref required');
    process.exit(1);
    return;
  }

  try {
    await clickSession(session, selector);
    console.log(JSON.stringify({ ok: true, selector }, null, 2));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
