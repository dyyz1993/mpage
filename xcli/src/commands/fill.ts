import { fillSession } from '../core/session-client';
import type { CommandValues } from '../core/types';

export async function fillCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';
  const [selector, text] = args;

  if (!selector || !text) {
    console.error('Usage: xcli fill <@eref> <text>');
    process.exit(1);
  }

  try {
    const result = await fillSession(session, selector, text);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
