import { navigateSession, refreshSession, gotoSession } from '../core/session-client';
import { existsSync } from 'fs';
import { join } from 'path';
import { SESSION_DIR } from '../core/constants';

export async function navigateCommand(args: string[], values: Record<string, any>) {
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  const action = args[0];

  try {
    let result: any;

    switch (action) {
      case 'back':
        result = await navigateSession(session, 'back');
        break;
      case 'forward':
        result = await navigateSession(session, 'forward');
        break;
      case 'refresh':
        result = await refreshSession(session);
        break;
      case 'goto':
        if (!args[1]) {
          console.error('Error: URL required for goto');
          process.exit(1);
        }
        result = await gotoSession(session, args[1]);
        break;
      default:
        console.error(`Error: Unknown action '${action}'. Use: back, forward, refresh, goto <url>`);
        process.exit(1);
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
