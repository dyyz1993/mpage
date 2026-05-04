const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

export function tip(messages: string | string[]): void {
  const items = Array.isArray(messages) ? messages : [messages];
  for (const msg of items) {
    console.error(`${YELLOW}[提示] ${msg}${RESET}`);
  }
}
