import type { CommandValues } from '@xcli/core';

// eslint-disable-next-line require-await
export async function daemonCommand(args: string[], _values: CommandValues) {
  const action = args[0];

  console.error(
    'Error: daemon command requires daemon-manager which is not available in @xcli/browser'
  );
  console.error('Use @xcli/daemon package instead');
  process.exit(1);

  void action;
}
