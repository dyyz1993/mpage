import { z } from 'zod';
import { ok } from '@dyyz1993/xcli-core';
import type { BrowserCommandDefinition } from './command-registry.js';

const params = z.object({
  selector: z.string().default('body').describe('Root selector to analyze'),
  maxDepth: z.number().default(5).describe('Maximum depth of structure tree'),
});

interface StructureNode {
  tag: string;
  role: string;
  text: string;
  children: StructureNode[];
}

// eslint-disable-next-line require-await
async function extractStructure(
  page: { evaluate: (fn: (arg: unknown) => unknown, arg: unknown) => Promise<StructureNode> },
  selector: string,
  maxDepth: number
): Promise<StructureNode> {
  return page.evaluate(
    (arg: unknown) => {
      const { sel, depth } = arg as { sel: string; depth: number };
      function buildTree(el: Element, d: number): StructureNode {
        if (d <= 0) {
          return {
            tag: el.tagName.toLowerCase(),
            role: el.getAttribute('role') ?? '',
            text: '',
            children: [],
          };
        }
        const children: StructureNode[] = [];
        for (const child of Array.from(el.children)) {
          children.push(buildTree(child, d - 1));
        }
        return {
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') ?? '',
          text: (el.textContent ?? '').substring(0, 100),
          children,
        };
      }
      const root = document.querySelector(sel);
      if (!root) return { tag: 'none', role: '', text: '', children: [] };
      return buildTree(root, depth);
    },
    { sel: selector, depth: maxDepth }
  );
}

export const structureCommand: BrowserCommandDefinition<typeof params> = {
  name: 'structure',
  description: 'Get the DOM structure of the page or an element',
  scope: 'page',
  parameters: params,
  handler: async (p, ctx) => {
    const structure = await extractStructure(ctx.page, p.selector, p.maxDepth);
    return ok({ structure });
  },
};
