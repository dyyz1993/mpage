import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

const itemSchema = z.object({
  id: z.number().describe('商品ID'),
  name: z.string().describe('商品名称'),
  category: z.string().describe('分类'),
  price: z.number().describe('价格'),
  rating: z.number().describe('评分'),
  stock: z.number().describe('库存'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '28-virtual-scroll',
    url: crawlerUrl('28-virtual-scroll'),
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: 'DOM 只渲染可见项。直接调用 API 获取完整数据。',
    parameters: z.object({}),
    result: z.object({
      data: z.array(itemSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 28-virtual-scroll scrape',
        output: `data:
  - id: 1
    name: "商品A"
    category: "电子产品"
    price: 999.00
    rating: 4.5
    stock: 100
tips:
  - "采集到 1000 条虚拟滚动数据"`,
      },
    ],
    handler: async (_params, ctx) => {
      try {
        await safeGoto(ctx.page, plugin.url);
        await ctx.page.waitForSelector('.virtual-list-container');

        const data = await ctx.page.evaluate(async () => {
          try {
            const resp = await fetch('/examples/28/items?offset=0&limit=1000');
            const items = await resp.json();
            if (!Array.isArray(items)) return [];
            return items.map((item: Record<string, unknown>) => ({
              id: typeof item.id === 'number' ? item.id : 0,
              name: typeof item.name === 'string' ? item.name : '',
              category: typeof item.category === 'string' ? item.category : '',
              price: typeof item.price === 'number' ? item.price : 0,
              rating: typeof item.rating === 'number' ? item.rating : 0,
              stock: typeof item.stock === 'number' ? item.stock : 0,
            }));
          } catch {
            return [];
          }
        });

        return ok(data, [`采集到 ${data.length} 条虚拟滚动数据`]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });

  plugin.command('verify', {
    description: '自动验证采集结果',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(itemSchema),
      errors: z.array(
        z.object({
          field: z.string(),
          expected: z.string(),
          actual: z.string(),
        })
      ),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 28-virtual-scroll verify',
        output: `status: pass
data:
  - id: 1
    name: "商品A"
errors: []
tips:
  - "校验通过"`,
      },
    ],
    handler: async (_params, ctx) => {
      try {
        await safeGoto(ctx.page, plugin.url);
        await ctx.page.waitForSelector('.virtual-list-container');

        const data = await ctx.page.evaluate(async () => {
          try {
            const resp = await fetch('/examples/28/items?offset=0&limit=1000');
            const items = await resp.json();
            if (!Array.isArray(items)) return [];
            return items.map((item: Record<string, unknown>) => ({
              id: typeof item.id === 'number' ? item.id : 0,
              name: typeof item.name === 'string' ? item.name : '',
              category: typeof item.category === 'string' ? item.category : '',
              price: typeof item.price === 'number' ? item.price : 0,
              rating: typeof item.rating === 'number' ? item.rating : 0,
              stock: typeof item.stock === 'number' ? item.stock : 0,
            }));
          } catch {
            return [];
          }
        });

        const errors: Array<{ field: string; expected: string; actual: string }> = [];
        if (data.length === 0) errors.push({ field: 'count', expected: '>0', actual: '0' });
        data.slice(0, 5).forEach((item, i) => {
          if (!item.name) errors.push({ field: `[${i}].name`, expected: '非空', actual: '空' });
        });

        const status = errors.length === 0 ? ('pass' as const) : ('fail' as const);
        const tips = status === 'pass' ? ['校验通过'] : [`${errors.length} 个问题`];

        return { status, data, errors, tips };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          status: 'fail' as const,
          data: [],
          errors: [{ field: 'page', expected: '加载成功', actual: msg }],
          tips: [],
        };
      }
    },
  });
}
