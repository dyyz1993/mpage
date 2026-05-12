import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

const itemSchema = z.object({
  id: z.number().describe('产品ID'),
  name: z.string().describe('产品名称'),
  price: z.number().describe('价格'),
  rating: z.number().describe('评分'),
  reviews: z.number().describe('评论数'),
  stock: z.string().describe('库存状态'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '23-css-in-js',
    url: crawlerUrl('23-css-in-js'),
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '随机类名无法使用。使用 data-testid、aria-label 等属性提取。',
    parameters: z.object({}),
    result: z.object({
      data: z.array(itemSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 23-css-in-js scrape',
        output: `data:
  - id: 1
    name: "无线机械键盘"
    price: 599
    rating: 4.8
    reviews: 128
    stock: "有货"
tips:
  - "采集到 6 条 CSS-in-JS 数据"`,
      },
    ],
    handler: async (_params, ctx) => {
      try {
        await safeGoto(ctx.page, plugin.url);
        await ctx.page.waitForSelector('[data-testid="product-card"]');
        await ctx.page.waitForTimeout(500);

        const data = await ctx.page.evaluate(() => {
          const cards = document.querySelectorAll('[data-testid="product-card"]');
          return Array.from(cards).map((card) => {
            const id = parseInt(card.getAttribute('data-product-id') || '0');
            const name =
              card.querySelector('[data-testid="product-name"]')?.textContent?.trim() || '';
            const priceText =
              card.querySelector('[data-testid="product-price"]')?.textContent?.trim() || '';
            const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
            const ratingText =
              card.querySelector('[data-testid="rating"]')?.textContent?.trim() || '';
            const rating = parseFloat(ratingText.replace(/[^\d.]/g, '')) || 0;
            const reviewsText =
              card.querySelector('[data-testid="reviews"]')?.textContent?.trim() || '';
            const reviews = parseInt(reviewsText.replace(/[^\d]/g, '')) || 0;
            const stock =
              card.querySelector('[data-testid="add-to-cart-btn"]')?.getAttribute('data-stock') ||
              '';
            return { id, name, price, rating, reviews, stock };
          });
        });

        return ok(data, [`采集到 ${data.length} 条 CSS-in-JS 数据`]);
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
        cmd: 'xcli 23-css-in-js verify',
        output: `status: pass
data:
  - id: 1
    name: "无线机械键盘"
errors: []
tips:
  - "校验通过"`,
      },
    ],
    handler: async (_params, ctx) => {
      try {
        await safeGoto(ctx.page, plugin.url);
        await ctx.page.waitForSelector('[data-testid="product-card"]');
        await ctx.page.waitForTimeout(500);

        const data = await ctx.page.evaluate(() => {
          const cards = document.querySelectorAll('[data-testid="product-card"]');
          return Array.from(cards).map((card) => {
            const id = parseInt(card.getAttribute('data-product-id') || '0');
            const name =
              card.querySelector('[data-testid="product-name"]')?.textContent?.trim() || '';
            const priceText =
              card.querySelector('[data-testid="product-price"]')?.textContent?.trim() || '';
            const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
            const ratingText =
              card.querySelector('[data-testid="rating"]')?.textContent?.trim() || '';
            const rating = parseFloat(ratingText.replace(/[^\d.]/g, '')) || 0;
            const reviewsText =
              card.querySelector('[data-testid="reviews"]')?.textContent?.trim() || '';
            const reviews = parseInt(reviewsText.replace(/[^\d]/g, '')) || 0;
            const stock =
              card.querySelector('[data-testid="add-to-cart-btn"]')?.getAttribute('data-stock') ||
              '';
            return { id, name, price, rating, reviews, stock };
          });
        });

        const errors: Array<{ field: string; expected: string; actual: string }> = [];
        if (data.length < 1)
          errors.push({ field: 'count', expected: '>=1', actual: String(data.length) });
        data.forEach((item, i) => {
          if (!item.name) errors.push({ field: `[${i}].name`, expected: '非空', actual: '空' });
          if (item.price <= 0)
            errors.push({ field: `[${i}].price`, expected: '>0', actual: String(item.price) });
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
