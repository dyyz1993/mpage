import { listSessions } from '@xcli/session';
import type { CommandValues } from '@xcli/core';

export async function listCommand(_args: string[], _values: CommandValues) {
  try {
    const sessions = await listSessions();

    if (!Array.isArray(sessions) || sessions.length === 0) {
      console.log('No active sessions.');
      return;
    }

    console.log('Active sessions:');
    for (const s of sessions) {
      console.log(`  ${s.name}\t${s.id}`);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
