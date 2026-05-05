#!/usr/bin/env node
import { routeCommand } from '../src/cli/router.js';

async function main() {
  const args = process.argv.slice(2);
  await routeCommand(args);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
