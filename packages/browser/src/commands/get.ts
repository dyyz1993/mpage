import { getElementSession } from '@xcli/session';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandValues } from '@xcli/core';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function getCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  const property = args[0] || (values.property as string);
  const selector = args[1] || (values.selector as string);

  if (!property) {
    console.error('Error: Property required (text, url, title, or @eref for element)');
    process.exit(1);
    return;
  }

  try {
    const result = await getElementSession(session, property, selector);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
