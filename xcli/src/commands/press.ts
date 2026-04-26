import { pressSession } from '../core/session-client';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandValues } from '../core/types';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function pressCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  const key = args[0] || (values.key as string);
  const selector = args[1] || (values.selector as string);

  if (!key) {
    console.error('Error: Key required (e.g., Enter, Escape, Tab)');
    process.exit(1);
    return;
  }

  try {
    const result = await pressSession(session, key, selector);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
