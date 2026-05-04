import type { CommandArgs, CommandValues } from '@xcli/core';

// eslint-disable-next-line require-await
export async function archiveCommand(args: CommandArgs, values: CommandValues) {
  console.error(
    'Error: archive command requires session-archive which is not available in @xcli/browser'
  );
  console.error('Use @xcli/session package instead');
  process.exit(1);

  void args;
  void values;
}
