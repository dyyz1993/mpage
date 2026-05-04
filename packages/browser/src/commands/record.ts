import { daemonRequest, requireSession } from '@xcli/session';
import type { CommandValues } from '@xcli/core';

// eslint-disable-next-line require-await -- 代理函数，返回 Promise
async function recorderRequest(
  method: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return daemonRequest(method, params);
}

export async function recordCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';
  const subCommand = args[0];

  if (!subCommand || subCommand === 'help') {
    console.log('Usage: xcli record <start|stop|status> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  start --url <url>    Start recording');
    console.log('  stop                 Stop recording and save');
    console.log('  status               Show recording status');
    return;
  }

  if (subCommand === 'start') {
    const url = (values.url as string) || args[1];
    if (!url) {
      console.error('Error: --url is required for record start');
      console.error('Usage: xcli record start --url <url>');
      process.exit(1);
    }

    requireSession(session);

    try {
      const result = await recorderRequest('recorder.start', {
        name: session,
        url,
        recorderName: values.name as string | undefined,
      });
      if (values.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Recording started: ${url}`);
        console.log(`  Recording ID: ${(result as Record<string, unknown>).recordingId}`);
        console.log(`  Session: ${session}`);
      }
    } catch (error) {
      console.error(`Failed to start recording: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
    return;
  }

  if (subCommand === 'stop') {
    requireSession(session);

    try {
      const result = await recorderRequest('recorder.stop', {
        name: session,
        outputPath: values.output as string | undefined,
      });
      if (values.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Recording saved: ${(result as Record<string, unknown>).path}`);
        console.log(`  Events: ${(result as Record<string, unknown>).eventCount}`);
      }
    } catch (error) {
      console.error(`Failed to stop recording: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
    return;
  }

  if (subCommand === 'status') {
    requireSession(session);

    try {
      const result = await recorderRequest('recorder.status', { name: session });
      const status = (result as Record<string, unknown>).status as Record<string, unknown> | null;
      if (values.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (status) {
        console.log(`Recording: active`);
        console.log(`  Events: ${status.eventCount}`);
        console.log(`  Duration: ${Math.round((status.duration as number) / 1000)}s`);
      } else {
        console.log('No active recording');
      }
    } catch (error) {
      console.error(`Failed to get status: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
    return;
  }

  console.error(`Unknown record sub-command: ${subCommand}`);
  process.exit(1);
}
