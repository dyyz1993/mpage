import { gotoSession } from '../core/session-client';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function gotoCommand(args: string[], values: Record<string, any>) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  const url = args[0];
  if (!url) {
    console.error('Error: URL required');
    process.exit(1);
    return;
  }

  try {
    await gotoSession(session, url);
    console.log(JSON.stringify({ ok: true, url }, null, 2));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
