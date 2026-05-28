import { chromium } from 'playwright-core';
import { DEFAULT_CHROMIUM_PATH } from '../constants.js';
import { DebugPage } from './debug-page.js';
import type { DebugPageOptions } from './debug-page.js';

export async function connect(cdpEndpoint: string): Promise<DebugPage> {
  const browser = await chromium.connectOverCDP(cdpEndpoint);
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());
  return new DebugPage(page, browser, context, true);
}

export async function createPage(options: DebugPageOptions = {}): Promise<DebugPage> {
  if (options.cdp) {
    return connect(options.cdp);
  }

  const browser = await chromium.launch({
    headless: options.headless ?? true,
    executablePath: options.chromiumPath || DEFAULT_CHROMIUM_PATH,
  });

  const context = await browser.newContext({
    viewport: options.viewport,
  });

  const page = await context.newPage();
  return new DebugPage(page, browser, context, true);
}
