const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

export function tip(message: string): void {
  console.error(`${YELLOW}[提示] ${message}${RESET}`);
}
