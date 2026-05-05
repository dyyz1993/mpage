import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().default('body').describe('Root selector'),
  interactiveOnly: z.boolean().default(false).describe('Only interactive elements'),
});

interface SnapshotElement {
  ref: string;
  tag: string;
  role: string;
  text: string;
  attrs: Record<string, string>;
}

export const snapshotCommand: BrowserCommandDefinition<typeof params> = {
  name: 'snapshot',
  description: 'Get a snapshot of page elements',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    const elements: SnapshotElement[] = await ctx.page.evaluate(
      ({ selector, interactiveOnly }) => {
        const root = document.querySelector(selector);
        if (!root) return [];

        const interactiveTags = new Set([
          'A',
          'BUTTON',
          'INPUT',
          'SELECT',
          'TEXTAREA',
          'SUMMARY',
          'DETAILS',
        ]);
        const interactiveRoles = new Set([
          'button',
          'link',
          'textbox',
          'checkbox',
          'radio',
          'combobox',
          'searchbox',
          'slider',
          'switch',
          'tab',
          'menuitem',
          'option',
        ]);

        const result: Array<{
          ref: string;
          tag: string;
          role: string;
          text: string;
          attrs: Record<string, string>;
        }> = [];
        let idx = 0;

        function walk(el: Element, path: string): void {
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute('role') ?? '';
          const text = (el.textContent ?? '').substring(0, 200).trim();
          const attrs: Record<string, string> = {};
          for (const attr of Array.from(el.attributes)) {
            if (['class', 'style'].includes(attr.name)) continue;
            attrs[attr.name] = attr.value;
          }

          const isInteractive =
            interactiveTags.has(el.tagName) ||
            interactiveRoles.has(role) ||
            el.hasAttribute('tabindex') ||
            el.hasAttribute('onclick') ||
            tag === 'a' ||
            tag === 'button';

          if (!interactiveOnly || isInteractive) {
            result.push({ ref: path, tag, role, text, attrs });
          }

          for (const child of Array.from(el.children)) {
            idx++;
            walk(child, `@${idx}`);
          }
        }

        walk(root, '@0');
        return result;
      },
      { selector: p.selector, interactiveOnly: p.interactiveOnly }
    );

    return ok({ elements });
  },
};
