import type { Page } from 'playwright-core';
import type { WaitCondition } from './types.js';

export async function executeWaits(page: Page, conditions: WaitCondition[]): Promise<void> {
  for (const condition of conditions) {
    await executeWait(page, condition);
  }
}

export async function waitForAICompletion(page: Page): Promise<void> {
  const loadingSelectors = [
    '[class*="generating"]',
    '[class*="loading"]',
    '[data-status="generating"]',
    '[data-state="streaming"]',
  ];

  for (const selector of loadingSelectors) {
    try {
      await page
        .waitForSelector(selector, {
          state: 'hidden',
          timeout: 30000,
        })
        .catch(() => {});
    } catch (e) {
      console.warn('[Playback] Wait condition failed:', e);
    }
  }

  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function executeWait(page: Page, condition: WaitCondition): Promise<void> {
  const timeout = condition.timeout || 30000;

  switch (condition.type) {
    case 'element_visible':
      if (condition.selector) {
        await page.waitForSelector(condition.selector, { state: 'visible', timeout });
      }
      break;

    case 'element_hidden':
      if (condition.selector) {
        await page.waitForSelector(condition.selector, { state: 'hidden', timeout });
      }
      break;

    case 'element_attached':
      if (condition.selector) {
        await page.waitForSelector(condition.selector, { state: 'attached', timeout });
      }
      break;

    case 'element_detached':
      if (condition.selector) {
        await page.waitForSelector(condition.selector, { state: 'detached', timeout });
      }
      break;

    case 'text_present':
      if (condition.text) {
        await page.waitForFunction(
          (text) => document.body.innerText.includes(text),
          condition.text,
          { timeout }
        );
      }
      break;

    case 'text_gone':
      if (condition.text) {
        await page.waitForFunction(
          (text) => !document.body.innerText.includes(text),
          condition.text,
          { timeout }
        );
      }
      break;

    case 'url_match':
      if (condition.url) {
        await page.waitForURL(condition.url, { timeout });
      }
      break;

    case 'page_load':
      await page.waitForLoadState('load', { timeout });
      break;

    case 'network_idle':
      await page.waitForLoadState('networkidle', { timeout });
      break;

    case 'timeout':
      await page.waitForTimeout(condition.timeout || 1000);
      break;
  }
}
