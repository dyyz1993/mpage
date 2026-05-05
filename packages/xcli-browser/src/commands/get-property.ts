import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().optional().describe('Element selector'),
  property: z
    .enum([
      'text',
      'innerHTML',
      'outerHTML',
      'value',
      'checked',
      'disabled',
      'href',
      'src',
      'alt',
      'title',
      'placeholder',
      'tagName',
      'id',
      'className',
    ])
    .describe('Property to get'),
});

export const getPropertyCommand: BrowserCommandDefinition<typeof params> = {
  name: 'getProperty',
  description: 'Get a property value from an element',
  scope: 'element',
  parameters: params,
  handler: async (p, ctx) => {
    const selector = p.selector ?? 'body';
    const element = ctx.page.locator(selector).first();

    let value: string | null | boolean;
    switch (p.property) {
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
        value = (await element.inputValue()) as string;
        break;
      case 'checked':
        value = await element.isChecked();
        break;
      case 'disabled':
        value = await element.isDisabled();
        break;
      default:
        value = (await element.getAttribute(p.property)) ?? null;
        break;
    }

    return ok({ selector, property: p.property, value });
  },
};
