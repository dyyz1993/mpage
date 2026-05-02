import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

const itemSchema = z.object({
  id: z.number().describe('商品ID'),
  name: z.string().describe('商品名称'),
  price: z.number().describe('价格'),
  detail: z.string().describe('详情'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '22-portal-teleport',
    url: crawlerUrl('22-portal-teleport'),
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '内容渲染到 body。处理脱离组件树的元素。',
    parameters: z.object({}),
    result: z.object({
      data: z.array(itemSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 22-portal-teleport scrape',
        output: `data:
  - id: 101
    name: "极客机械键盘"
    price: 599
    detail: "全键无冲，幻彩背光，国产青轴"
tips:
  - "采集到 4 条 Portal/Teleport 数据"`,
      },
    ],
    handler: async (_params, ctx) => {
      try {
        await safeGoto(ctx.page, plugin.url);
        await ctx.page.waitForSelector('.button-grid');
        await ctx.page.waitForTimeout(1000);

        const btnCount = await ctx.page.evaluate(() => {
          return document.querySelectorAll('.portal-btn, .portal-button').length;
        });

        const items: Array<{ id: number; name: string; price: number; detail: string }> = [];

        for (let i = 0; i < btnCount; i++) {
          await ctx.page.evaluate((idx) => {
            const btns = document.querySelectorAll('.portal-btn, .portal-button');
            if (btns[idx]) (btns[idx] as HTMLElement).click();
          }, i);

          await ctx.page.waitForSelector('#portal-root .modal-content', { timeout: 5000 });

          const itemData = await ctx.page.evaluate(() => {
            const portal = document.getElementById('portal-root');
            if (!portal) return null;
            const title = portal.querySelector('.modal-title')?.textContent || '';
            const name = title.replace(/\s*-\s*详细规格$/, '').trim();
            const details = portal.querySelectorAll('.product-detail-item');
            let id = 0;
            let price = 0;
            let detail = '';
            details.forEach((d) => {
              const label = d.querySelector('.detail-label')?.textContent?.trim() || '';
              const value = d.querySelector('.detail-value')?.textContent?.trim() || '';
              if (label.includes('ID')) id = parseInt(value) || 0;
              else if (label.includes('价格'))
                price = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
              else if (label.includes('详情')) detail = value;
            });
            return { id, name, price, detail };
          });

          if (itemData) items.push(itemData);

          await ctx.page.evaluate(() => {
            const portal = document.getElementById('portal-root');
            if (portal) portal.remove();
          });
          await ctx.page.waitForTimeout(300);
        }

        return ok(items, [`采集到 ${items.length} 条 Portal/Teleport 数据`]);
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
        cmd: 'xcli 22-portal-teleport verify',
        output: `status: pass
data:
  - id: 101
    name: "极客机械键盘"
errors: []
tips:
  - "校验通过"`,
      },
    ],
    handler: async (_params, ctx) => {
      try {
        await safeGoto(ctx.page, plugin.url);
        await ctx.page.waitForSelector('.button-grid');
        await ctx.page.waitForTimeout(1000);

        const btnCount = await ctx.page.evaluate(() => {
          return document.querySelectorAll('.portal-btn, .portal-button').length;
        });

        const data: Array<{ id: number; name: string; price: number; detail: string }> = [];

        for (let i = 0; i < btnCount; i++) {
          await ctx.page.evaluate((idx) => {
            const btns = document.querySelectorAll('.portal-btn, .portal-button');
            if (btns[idx]) (btns[idx] as HTMLElement).click();
          }, i);

          await ctx.page.waitForSelector('#portal-root .modal-content', { timeout: 5000 });

          const itemData = await ctx.page.evaluate(() => {
            const portal = document.getElementById('portal-root');
            if (!portal) return null;
            const title = portal.querySelector('.modal-title')?.textContent || '';
            const name = title.replace(/\s*-\s*详细规格$/, '').trim();
            const details = portal.querySelectorAll('.product-detail-item');
            let id = 0;
            let price = 0;
            let detail = '';
            details.forEach((d) => {
              const label = d.querySelector('.detail-label')?.textContent?.trim() || '';
              const value = d.querySelector('.detail-value')?.textContent?.trim() || '';
              if (label.includes('ID')) id = parseInt(value) || 0;
              else if (label.includes('价格'))
                price = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
              else if (label.includes('详情')) detail = value;
            });
            return { id, name, price, detail };
          });

          if (itemData) data.push(itemData);

          await ctx.page.evaluate(() => {
            const portal = document.getElementById('portal-root');
            if (portal) portal.remove();
          });
          await ctx.page.waitForTimeout(300);
        }

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
