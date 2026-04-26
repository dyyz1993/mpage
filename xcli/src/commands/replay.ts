import { daemonRequest, requireSession } from '../core/session-client';
import type { CommandValues } from '../core/types';

export async function replayCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';
  const filePath = args[0];

  if (!filePath) {
    console.error('Usage: xcli replay <file.yaml>');
    console.error('  xcli replay recording.yaml');
    console.error('  xcli --session demo replay recording.yaml --slow-mo 2');
    process.exit(1);
  }

  requireSession(session);

  try {
    const result = await daemonRequest('replay.start', {
      name: session,
      filePath,
      slowMo: values.slowMo ? Number(values.slowMo) : undefined,
    });

    const replayResult = (result as Record<string, unknown>).result as Record<string, unknown>;

    if (values.json) {
      console.log(JSON.stringify(replayResult, null, 2));
    } else {
      console.log(`Replay ${replayResult.success ? 'succeeded' : 'failed'}`);
      console.log(`  Events played: ${replayResult.eventsPlayed}/${replayResult.totalEvents}`);
      console.log(`  Duration: ${replayResult.duration}ms`);

      const errors = replayResult.errors as Array<Record<string, unknown>> | undefined;
      if (errors && errors.length > 0) {
        console.log(`  Errors:`);
        for (const err of errors) {
          console.log(`    Event #${err.eventIndex}: ${err.error}`);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to replay: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
