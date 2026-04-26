import { evalScriptSession } from '../core/session-client';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandValues } from '../core/types';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function evalCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  let script = '';

  if (values.file) {
    const filePath = values.file as string;
    if (!existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
      return;
    }
    script = readFileSync(filePath, 'utf-8');
  } else if (args.length > 0) {
    script = args.join(' ').trim();
  }

  if (!script) {
    console.error(
      'Error: No script provided. Usage: xcli eval <script> or xcli eval --file <path>'
    );
    process.exit(1);
    return;
  }

  try {
    const result = await evalScriptSession(session, script);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
