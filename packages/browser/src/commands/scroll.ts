import { scrollSession } from '@xcli/session';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandValues } from '@xcli/core';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function scrollCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  const direction = (args[0] as 'up' | 'down') || 'down';
  const distance = parseInt(args[1] || '500', 10);

  try {
    await scrollSession(session, direction, distance);
    console.log(JSON.stringify({ ok: true, direction, distance }, null, 2));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
