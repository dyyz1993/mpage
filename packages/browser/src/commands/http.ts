import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandValues } from '@xcli/core';

const SESSION_DIR = join(homedir(), '.xcli', 'sessions');

export async function httpCommand(args: string[], values: CommandValues) {
  const [method, url] = args;
  const session = (values.session as string) || 'default';
  const sessionFile = join(SESSION_DIR, `${session}.json`);

  if (!method || !url) {
    console.error('Usage: xcli http <get|post> <url> [--body <json>]');
    process.exit(1);
    return;
  }

  if (!sessionFile || !existsSync(sessionFile)) {
    console.error(`Error: Session '${session}' not found. Use "xcli open <url>" to create one.`);
    process.exit(1);
    return;
  }

  try {
    const daemonConfig = JSON.parse(
      readFileSync(join(homedir(), '.xcli', 'sessions', 'daemon.json'), 'utf-8')
    );
    void daemonConfig;

    const body = values.body ? JSON.parse(values.body as string) : undefined;

    const result = await fetch(url, {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = result.headers.get('content-type') || '';
    let data: unknown;

    if (contentType.includes('json')) {
      data = await result.json();
    } else {
      data = await result.text();
    }

    console.log(
      JSON.stringify(
        {
          status: result.status,
          ok: result.ok,
          contentType,
          data,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
