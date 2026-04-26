import { mouseSession } from '../core/session-client';
import type { CommandValues } from '../core/types';

export async function mouseCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';

  const [action, xStr, yStr, stepsStr] = args;
  const x = xStr ? parseInt(xStr, 10) : 0;
  const y = yStr ? parseInt(yStr, 10) : 0;
  const steps = stepsStr ? parseInt(stepsStr, 10) : 1;

  if (!action) {
    console.error('Usage: xcli mouse <move|down|up|click> [x] [y] [steps]');
    process.exit(1);
  }

  const validActions = ['move', 'down', 'up', 'click'];
  if (!validActions.includes(action)) {
    console.error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
    process.exit(1);
  }

  try {
    const result = await mouseSession(
      session,
      action as 'move' | 'down' | 'up' | 'click',
      x,
      y,
      steps
    );
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
