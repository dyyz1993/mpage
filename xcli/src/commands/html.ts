import { htmlSession } from '../core/session-client';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function htmlCommand(args: string[], values: Record<string, any>) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  try {
    const html = await htmlSession(session);

    if (values.json) {
      console.log(JSON.stringify({ data: html }, null, 2));
    } else {
      console.log(html);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}