import { openSession } from '../core/session-client';
import type { CommandValues } from '../core/types';

export async function openCommand(args: string[], values: CommandValues) {
  const url = args[0];
  const session = (values.session as string) || 'default';

  if (!url) {
    console.error('Usage: xcli open <url>');
    console.error('  xcli open https://example.com');
    console.error('  xcli --session demo open https://example.com');
    process.exit(1);
  }

  try {
    const info = await openSession(session, url);

    if (values.json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            session: info.name,
            url: info.url,
            id: info.id,
          },
          null,
          2
        )
      );
    } else {
      console.log(`✓ Opened: ${info.url}`);
      console.log(`  Session: ${info.name}`);
      console.log(`  View: xcli --session ${info.name} viewer`);
    }
  } catch (error) {
    console.error(`Failed to open ${url}: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
