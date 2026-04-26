import { daemonRequest, requireSession } from '../core/session-client';
import type { CommandValues } from '../core/types';

export async function structureCommand(args: string[], values: CommandValues) {
  const session = (values.session as string) || 'default';
  const selector = (values.selector as string) || args[0] || 'body';

  requireSession(session);

  try {
    const result = await daemonRequest('page.structure', {
      name: session,
      selector,
    });

    const structure = (result as Record<string, unknown>).structure as Record<string, unknown>;

    if (values.json) {
      console.log(JSON.stringify(structure, null, 2));
    } else {
      const layout = structure.layout as Record<string, unknown> | null;
      if (!layout) {
        console.log('No structure found');
        return;
      }

      const yaml = structure.yaml as string;
      if (yaml) {
        console.log(yaml);
      }

      const lists = layout.lists as Array<Record<string, unknown>> | undefined;
      if (lists && lists.length > 0) {
        console.log(`\nLists: ${lists.length}`);
        for (const list of lists) {
          console.log(`  ${list.selector}: ${list.type} x${list.count}`);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to get structure: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
