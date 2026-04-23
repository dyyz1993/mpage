import { selectSession } from '../core/session-client';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function selectCommand(args: string[], values: Record<string, any>) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  const selector = args[0] || (values.ref as string);
  const value = args[1] || (values.value as string);

  if (!selector) {
    console.error('Error: Selector or ref required');
    process.exit(1);
    return;
  }

  if (!value) {
    console.error('Error: Value required');
    process.exit(1);
    return;
  }

  try {
    const result = await selectSession(session, selector, value);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}