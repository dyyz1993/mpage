import type { Page } from 'playwright-core';
import type { AssertCondition } from './types.js';

export async function executeAssertions(page: Page, conditions: AssertCondition[]): Promise<void> {
  for (const condition of conditions) {
    await executeAssertion(page, condition);
  }
}

async function executeAssertion(page: Page, condition: AssertCondition): Promise<void> {
  switch (condition.type) {
    case 'element_exists':
      if (condition.selector) {
        const element = await page.$(condition.selector);
        if (!element) {
          throw new Error(`Assertion failed: Element not found - ${condition.selector}`);
        }
      }
      break;

    case 'element_visible':
      if (condition.selector) {
        const visible = await page.isVisible(condition.selector);
        if (!visible) {
          throw new Error(`Assertion failed: Element not visible - ${condition.selector}`);
        }
      }
      break;

    case 'element_hidden':
      if (condition.selector) {
        const hidden = await page.isHidden(condition.selector);
        if (!hidden) {
          throw new Error(`Assertion failed: Element is visible - ${condition.selector}`);
        }
      }
      break;

    case 'text_equals':
      if (condition.selector && condition.expected !== undefined) {
        const text = await page.textContent(condition.selector);
        if (text !== condition.expected) {
          throw new Error(
            `Assertion failed: Text mismatch. Expected "${condition.expected}", got "${text}"`
          );
        }
      }
      break;

    case 'text_contains':
      if (condition.selector && condition.expected !== undefined) {
        const text = await page.textContent(condition.selector);
        if (!text?.includes(String(condition.expected))) {
          throw new Error(
            `Assertion failed: Text does not contain "${condition.expected}". Got "${text}"`
          );
        }
      }
      break;

    case 'url_equals':
      if (condition.expected !== undefined) {
        const url = page.url();
        if (url !== condition.expected) {
          throw new Error(
            `Assertion failed: URL mismatch. Expected "${condition.expected}", got "${url}"`
          );
        }
      }
      break;

    case 'url_contains':
      if (condition.expected !== undefined) {
        const url = page.url();
        if (!url.includes(String(condition.expected))) {
          throw new Error(
            `Assertion failed: URL does not contain "${condition.expected}". Got "${url}"`
          );
        }
      }
      break;
  }
}
