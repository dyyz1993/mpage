import type { Page, PageContext } from './types.js';
import type { CommandModule } from './types.js';

export const interactionCommands: CommandModule = {
  click: async (context: PageContext, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const options: Record<string, unknown> = {};
    if (args.timeout !== undefined) options.timeout = args.timeout;
    if (args.force !== undefined) options.force = args.force;
    if (args.button !== undefined) options.button = args.button;
    if (args.clickCount !== undefined) options.clickCount = args.clickCount;
    if (args.delay !== undefined) options.delay = args.delay;
    await context.waitForSelector(selector, { timeout: (args.timeout as number) || 10000 });
    await context.click(selector, options);
    return { selector };
  },

  dblclick: async (context: PageContext, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const options: Record<string, unknown> = {};
    if (args.timeout !== undefined) options.timeout = args.timeout;
    if (args.force !== undefined) options.force = args.force;
    if (args.button !== undefined) options.button = args.button;
    if (args.delay !== undefined) options.delay = args.delay;
    await context.waitForSelector(selector, { timeout: (args.timeout as number) || 10000 });
    await context.dblclick(selector, options);
    return { selector };
  },

  fill: async (context: PageContext, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const value = args.value as string;
    const options: Record<string, unknown> = {};
    if (args.timeout !== undefined) options.timeout = args.timeout;
    if (args.force !== undefined) options.force = args.force;
    if (args.clear === false) {
      await context.waitForSelector(selector, { timeout: (args.timeout as number) || 10000 });
      await context.fill(selector, value, options);
    } else {
      await context.waitForSelector(selector, { timeout: (args.timeout as number) || 10000 });
      await context.fill(selector, '', options);
      await context.fill(selector, value, options);
    }
    await context.evaluate((sel: string) => {
      const el = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, selector);
    return { selector, value };
  },

  type: async (context: PageContext, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const text = args.text as string;
    const options: Record<string, unknown> = {};
    if (args.timeout !== undefined) options.timeout = args.timeout;
    if (args.delay !== undefined) options.delay = args.delay;
    if (args.clear) {
      await context.fill(selector, '');
    }
    await context.type(selector, text, options);
    return { selector, text };
  },

  press: async (context: PageContext, args: Record<string, unknown>) => {
    const key = args.key as string;
    const selector = (args.selector as string) || 'body';
    const options: Record<string, unknown> = {};
    if (args.delay !== undefined) options.delay = args.delay;
    await context.press(selector, key, options);
    return { key, selector };
  },

  hover: async (context: PageContext, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const options: Record<string, unknown> = {};
    if (args.timeout !== undefined) options.timeout = args.timeout;
    if (args.force !== undefined) options.force = args.force;
    if (args.modifiers !== undefined) options.modifiers = args.modifiers;
    await context.hover(selector, options);
    return { selector };
  },

  scroll: async (context: PageContext, args: Record<string, unknown>) => {
    if (args.selector) {
      await context.locator(args.selector as string).scrollIntoViewIfNeeded();
      return { scrolledTo: args.selector };
    }
    if (args.deltaX !== undefined || args.deltaY !== undefined) {
      const dx = args.deltaX ?? 0;
      const dy = args.deltaY ?? 0;
      await context.evaluate(`window.scrollBy(${dx}, ${dy})`);
      return { deltaX: dx, deltaY: dy };
    }
    await context.evaluate(`window.scrollTo(${args.x ?? 0}, ${args.y ?? 0})`);
    return { x: args.x ?? 0, y: args.y ?? 0 };
  },

  select: async (context: PageContext, args: Record<string, unknown>) => {
    await context.waitForSelector(args.selector as string, { timeout: 10000 });
    const values = await context.selectOption(args.selector as string, args.value as string);
    return { selector: args.selector, value: args.value, selectedValues: values };
  },

  check: async (context: PageContext, args: Record<string, unknown>) => {
    await context.waitForSelector(args.selector as string, { timeout: 10000 });
    const checked = args.checked !== false;
    if (checked) {
      await context.check(args.selector as string, { force: (args.force as boolean) || false });
    } else {
      await context.uncheck(args.selector as string, { force: (args.force as boolean) || false });
    }
    return { selector: args.selector, checked };
  },

  waitForSelector: async (context: PageContext, args: Record<string, unknown>) => {
    await context.waitForSelector(args.selector as string, {
      timeout: (args.timeout as number) || 30000,
      state: args.state as 'attached' | 'detached' | 'visible' | 'hidden' | undefined,
    });
    return { selector: args.selector };
  },

  mouse: async (context: PageContext, args: Record<string, unknown>) => {
    const page = context as Page;
    const action = args.action as string;
    const x = (args.x as number) || 0;
    const y = (args.y as number) || 0;
    const button = args.button || 'left';
    const steps = args.steps || 1;
    if (action === 'move') {
      await page.mouse.move(x, y, { steps: steps as number });
    } else if (action === 'down') {
      await page.mouse.down({ button: button as 'left' | 'right' | 'middle' });
    } else if (action === 'up') {
      await page.mouse.up({ button: button as 'left' | 'right' | 'middle' });
    } else if (action === 'click') {
      await page.mouse.click(x, y, { button: button as 'left' | 'right' | 'middle' });
    } else if (action === 'dblclick') {
      await page.mouse.dblclick(x, y, { button: button as 'left' | 'right' | 'middle' });
    } else if (action === 'wheel') {
      await page.mouse.move(x, y);
      await page.mouse.wheel((args.deltaX as number) || 0, (args.deltaY as number) || 0);
    }
    return { action, x, y };
  },

  getProperty: async (context: PageContext, args: Record<string, unknown>) => {
    const selector = (args.selector as string) || 'body';
    const property = args.property as string;
    const element = context.locator(selector).first();
    let value: string | null | boolean;
    switch (property) {
      case 'text':
        value = await element.textContent();
        break;
      case 'innerHTML':
        value = await element.innerHTML();
        break;
      case 'outerHTML':
        value = (await element.evaluate((el) => el.outerHTML)) as string;
        break;
      case 'value':
        value = await element.inputValue();
        break;
      case 'checked':
        value = await element.isChecked();
        break;
      case 'disabled':
        value = await element.isDisabled();
        break;
      default:
        value = await element.getAttribute(property);
        break;
    }
    return { selector, property, value };
  },

  setViewport: async (context: PageContext, args: Record<string, unknown>) => {
    const page = context as Page;
    const viewport = page.viewportSize();
    const width = (args.width as number) ?? viewport?.width ?? 1280;
    const height = (args.height as number) ?? viewport?.height ?? 720;
    await page.setViewportSize({ width, height });
    return { width, height };
  },

  getCookies: async (context: PageContext) => {
    const page = context as Page;
    const cookies = await page.context().cookies();
    return { cookies };
  },

  setCookie: async (context: PageContext, args: Record<string, unknown>) => {
    const page = context as Page;
    const cookie: {
      name: string;
      value: string;
      path?: string;
      domain?: string;
      expires?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'Strict' | 'Lax' | 'None';
    } = {
      name: args.name as string,
      value: args.value as string,
    };
    if (args.path) cookie.path = args.path as string;
    else cookie.path = '/';
    if (args.domain) cookie.domain = args.domain as string;
    if (args.expires) cookie.expires = args.expires as number;
    if (args.httpOnly) cookie.httpOnly = args.httpOnly as boolean;
    if (args.secure) cookie.secure = args.secure as boolean;
    if (args.sameSite) cookie.sameSite = args.sameSite as 'Strict' | 'Lax' | 'None';
    await page.context().addCookies([cookie]);
    return { name: args.name };
  },

  clearCookies: async (context: PageContext) => {
    const page = context as Page;
    await page.context().clearCookies();
    return { cleared: true };
  },

  getLocalStorage: async (context: PageContext) => {
    const data = await context.evaluate(() => {
      const entries: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          entries[key] = localStorage.getItem(key) ?? '';
        }
      }
      return entries;
    });
    return { data };
  },

  setLocalStorage: async (context: PageContext, args: Record<string, unknown>) => {
    await context.evaluate(
      ({ key, value }: { key: string; value: string }) => {
        localStorage.setItem(key, value);
      },
      { key: args.key as string, value: args.value as string }
    );
    return { key: args.key };
  },

  clearLocalStorage: async (context: PageContext) => {
    await context.evaluate(() => {
      localStorage.clear();
    });
    return { cleared: true };
  },
};
