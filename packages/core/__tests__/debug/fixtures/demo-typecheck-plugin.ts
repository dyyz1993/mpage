import { z } from 'zod/v4';
import type { XCLIAPI } from '../../src/protocol/plugin-protocol.js';

const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
});

const HotItemSchema = z.object({
  rank: z.number(),
  title: z.string(),
  heat: z.string(),
});

export const commandDefs = {
  search: {
    parameters: z.object({
      query: z.string(),
      pages: z.number().optional(),
      limit: z.number().optional(),
    }),
    result: z.array(SearchResultSchema),
  },
  hotsearch: {
    parameters: z.object({
      category: z.enum(['hot', 'entertainment', 'sports', 'tech']).optional(),
    }),
    result: z.array(HotItemSchema),
  },
  suggest: {
    parameters: z.object({
      query: z.string(),
    }),
    result: z.array(z.string()),
  },
} as const;

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({ name: 'demo-typecheck', url: 'https://example.com' });

  site.command('search', {
    description: 'Search',
    parameters: commandDefs.search.parameters,
    handler: async (params) => {
      return {
        success: true,
        data: [{ title: `Result for ${params.query}`, url: 'https://a.com', snippet: 'test' }],
        tips: [`Found 1 result for "${params.query}"`],
      };
    },
  });

  site.command('hotsearch', {
    description: 'Hot search',
    parameters: commandDefs.hotsearch.parameters,
    handler: async () => {
      return {
        success: true,
        data: [{ rank: 1, title: 'Hot topic', heat: '9999' }],
        tips: [],
      };
    },
  });

  site.command('suggest', {
    description: 'Suggest',
    parameters: commandDefs.suggest.parameters,
    handler: async (params) => {
      return {
        success: true,
        data: [`${params.query} tutorial`, `${params.query} guide`],
        tips: [],
      };
    },
  });
}
