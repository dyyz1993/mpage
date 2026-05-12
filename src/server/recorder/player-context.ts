import type { Page, CDPSession } from 'playwright-core';

export interface PlayerContext {
  page: Page;
  getCdpSession: () => Promise<CDPSession>;
}
