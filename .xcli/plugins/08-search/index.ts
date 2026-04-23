import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

const SearchSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  url: z.string(),
  snippet: z.string(),
});

const resultSchema = z.object({
  success: z.boolean(),
  results: z.array(SearchSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '08-search',
    url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/08-search.html',
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '采集搜索结果数据',
    parameters: z.object({
      keyword: z.string().default('iPhone').describe('搜索关键词'),
    }),
    handler: async (params, ctx) => {
      const searchUrl =
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/08-search.html';
      const apiUrl =
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/08/search';

      await ctx.page.goto(searchUrl);
      await ctx.page.waitForLoadState('domcontentloaded');

      const body = JSON.stringify({ keyword: params.keyword || 'iPhone' });
      const response = await ctx.page.evaluate(async (b) => {
        const res = await fetch(
          'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/08/search',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: b,
          }
        );
        return res.json();
      }, body);

      const result = resultSchema.parse(response);
      const data = result.results.map((item) => ({
        id: item.id,
        name: item.title,
        price: item.price,
        url: item.url,
        snippet: item.snippet,
      }));

      return {
        data,
        tips: [`采集到 ${data.length} 条搜索结果，总计 ${result.total} 条`],
      };
    },
  });

  plugin.command('verify', {
    description: '校验搜索结果数据',
    parameters: z.object({
      keyword: z.string().default('iPhone').describe('搜索关键词'),
    }),
    handler: async (params, ctx) => {
      const searchUrl =
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/08-search.html';

      await ctx.page.goto(searchUrl);
      await ctx.page.waitForLoadState('domcontentloaded');

      const body = JSON.stringify({ keyword: params.keyword || 'iPhone' });
      const response = await ctx.page.evaluate(async (b) => {
        const res = await fetch(
          'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/08/search',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: b,
          }
        );
        return res.json();
      }, body);

      const result = resultSchema.parse(response);
      const data = result.results.map((item) => ({
        id: item.id,
        name: item.title,
        price: item.price,
        url: item.url,
        snippet: item.snippet,
      }));

      const errors: Array<{ field: string; expected: string; actual: string }> = [];

      if (!result.success) {
        errors.push({ field: 'success', expected: 'true', actual: 'false' });
      }

      if (!Array.isArray(result.results)) {
        errors.push({ field: 'results', expected: 'array', actual: typeof result.results });
      }

      if (result.results.length === 0) {
        errors.push({ field: 'results.length', expected: '> 0', actual: '0' });
      }

      for (let i = 0; i < result.results.length; i++) {
        const item = result.results[i];
        if (!item.title || !item.title.includes(params.keyword || 'iPhone')) {
          errors.push({
            field: `item[${i}].title`,
            expected: `包含 "${params.keyword || 'iPhone'}"`,
            actual: item.title,
          });
        }
        if (typeof item.price !== 'number') {
          errors.push({ field: `item[${i}].price`, expected: 'number', actual: typeof item.price });
        }
        if (item.price < 3000) {
          errors.push({
            field: `item[${i}].price`,
            expected: '>= 3000',
            actual: String(item.price),
          });
        }
      }

      return {
        data,
        errors,
        tips: errors.length === 0 ? ['校验通过'] : [`发现 ${errors.length} 个问题`],
      };
    },
  });
}
