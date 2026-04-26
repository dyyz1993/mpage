import { closeSession } from '../core/session-client';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandValues } from '../core/types';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function closeCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found.`);
    process.exit(1);
    return;
  }

  try {
    await closeSession(session);
    console.log(JSON.stringify({ ok: true, session }, null, 2));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
