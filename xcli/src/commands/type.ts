import { typeSession } from '../core/session-client';

export async function typeCommand(args: string[], values: Record<string, any>) {
  const session = (values.session as string) || 'default';
  const [selector, text] = args;

  if (!selector || !text) {
    console.error('Usage: xcli type <@eref> <text>');
    process.exit(1);
  }

  try {
    const result = await typeSession(session, selector, text);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
