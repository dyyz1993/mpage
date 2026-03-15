import type { Page } from 'playwright-core';
import type { CommandModule } from './types.js';

export const queryCommands: CommandModule = {
  query: async (page: Page, args: Record<string, unknown>) => {
    const selector = args.selector as string;
    const result = await page.evaluate((s) => {
      const elements = Array.from(document.querySelectorAll(s));
      return elements.slice(0, 20).map((el, i) => ({
        index: i,
        tagName: el.tagName,
        id: el.id || '',
        className: (el.className || '').toString().slice(0, 100),
        text: (el.textContent || '').trim().slice(0, 200),
        href: (el as HTMLAnchorElement).href || '',
      }));
    }, selector);
    return { elements: result, count: result.length };
  },

  find: async (page: Page, args: Record<string, unknown>) => {
    const text = args.text as string;
    const tag = (args.tag as string) || '*';
    const result = await page.evaluate(
      (opts) => {
        const allElements = Array.from(document.querySelectorAll(opts.tag));
        const matches: Element[] = [];

        const excludeTags = new Set([
          'SCRIPT',
          'STYLE',
          'NOSCRIPT',
          'META',
          'LINK',
          'HEAD',
          'HTML',
          'TITLE',
        ]);

        const containing = allElements.filter((el) => {
          if (excludeTags.has(el.tagName)) return false;
          const content = el.textContent || '';
          if (opts.exact) return content.trim() === opts.text;
          return content.includes(opts.text);
        });

        for (const el of containing) {
          const hasMoreSpecificChild = containing.some(
            (other) => other !== el && el.contains(other)
          );
          if (!hasMoreSpecificChild) {
            matches.push(el);
          }
        }

        return matches.slice(0, 20).map((el, i) => ({
          index: i,
          tagName: el.tagName,
          id: el.id || '',
          className: (el.className || '').toString().slice(0, 100),
          text: (el.textContent || '').trim().slice(0, 200),
          href: (el as HTMLAnchorElement).href || '',
          selector: el.id
            ? `#${el.id}`
            : el.className
              ? `.${el.className.split(' ')[0]}`
              : el.tagName.toLowerCase(),
        }));
      },
      { text, tag, exact: args.exact }
    );
    return { elements: result, count: result.length };
  },

  html: async (page: Page, args: Record<string, unknown>) => {
    let html: string;
    if (args.selector) {
      html = await page.innerHTML(args.selector as string);
    } else {
      html = await page.content();
    }

    if (args.clean) {
      html = html
        .replace(/\s*data-v-[a-f0-9]+="[^"]*"/gi, '')
        .replace(/\s*data-v-[a-f0-9]+/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/>\s+</g, '><')
        .replace(/\s*class=""/g, '')
        .replace(/\s*style=""/g, '')
        .replace(/\s*id=""/g, '')
        .replace(/<div\s*><\/div>/g, '')
        .replace(/<span\s*><\/span>/g, '')
        .replace(/<div\s*>\s*<\/div>/g, '')
        .replace(/<span\s*>\s*<\/span>/g, '')
        .trim();
    }

    return { html };
  },

  text: async (page: Page, args: Record<string, unknown>) => {
    const text = await page.textContent((args.selector as string) || 'body');
    return { text };
  },
};
