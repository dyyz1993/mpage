import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';

const CHROMIUM_PATH =
  process.env.MPAGE_CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cdpUrl: string;
}

export async function launchBrowser(): Promise<BrowserSession> {
  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROMIUM_PATH,
    args: ['--remote-debugging-port=0', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
  });

  const page = await context.newPage();
  return { browser, context, page, cdpUrl: browser.wsEndpoint() };
}

export async function connectCdp(cdpUrl: string): Promise<BrowserSession> {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const contexts = browser.contexts();
  const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
  const page = await context.newPage();
  return { browser, context, page, cdpUrl };
}

export async function closeSession(s: BrowserSession): Promise<void> {
  try {
    if (!s.page.isClosed()) await s.page.close().catch(() => {});
  } catch {}
  try {
    await s.context.close().catch(() => {});
  } catch {}
  try {
    if (s.browser.isConnected()) await s.browser.close().catch(() => {});
  } catch {}
}
