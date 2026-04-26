import { findSession } from './session-store';
import type { Cookie } from 'playwright';

export async function getStorage(name: string, type: string) {
  const session = findSession(name);
  if (!session) return type === 'cookies' ? { cookies: [] } : { localStorage: {} };

  if (type === 'cookies') {
    const cookies = await session.context.cookies();
    return { cookies };
  } else if (type === 'localStorage') {
    const lsData = await session.page.evaluate(() => {
      const result: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) result[key] = localStorage.getItem(key) || '';
      }
      return result;
    });
    return { localStorage: lsData };
  }
  return type === 'cookies' ? { cookies: [] } : { localStorage: {} };
}

export function setStorage(
  name: string,
  type: string,
  key?: string,
  value?: string,
  data?: Cookie
) {
  const session = findSession(name);
  if (!session) return;

  if (type === 'cookies' && data) {
    session.context.addCookies([data]);
  } else if (type === 'localStorage' && key !== undefined) {
    session.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value || '']);
  }
}

export function clearStorage(name: string, type: string) {
  const session = findSession(name);
  if (!session) return;

  if (type === 'cookies') {
    session.context.clearCookies();
  } else if (type === 'localStorage') {
    session.page.evaluate(() => localStorage.clear());
  }
}

export async function getPageHtml(name: string) {
  const session = findSession(name);
  if (!session) return { html: '' };
  return { html: await session.page.content() };
}

export async function getPageScreenshot(name: string) {
  const session = findSession(name);
  if (!session) return { screenshot: '' };
  const screenshot = await session.page.screenshot();
  return { screenshot: screenshot.toString('base64') };
}

export async function getPageSnapshot(name: string, interactiveOnly: boolean) {
  const session = findSession(name);
  if (!session) return { elements: [] };

  const elements = await session.page.evaluate((interactive: boolean) => {
    const allElements = document.querySelectorAll(
      interactive ? 'a, button, input, select, textarea, [onclick], [role="button"]' : '*'
    );
    const results: Array<{ tag: string; text: string; attrs: Record<string, string> }> = [];
    const seen = new Set<string>();

    allElements.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim().slice(0, 100) || '';
      const attrs: Record<string, string> = {};

      for (const attr of el.attributes) {
        attrs[attr.name] = attr.value;
      }

      const key = `${tag}-${text}-${Object.keys(attrs).join(',')}`;
      if (!seen.has(key) && (text || tag === 'img' || tag === 'input')) {
        seen.add(key);
        results.push({ tag, text, attrs });
      }
    });

    return results.slice(0, 100).map((item, idx) => ({
      ref: `@e${idx + 1}`,
      ...item,
    }));
  }, interactiveOnly);

  return { elements };
}
