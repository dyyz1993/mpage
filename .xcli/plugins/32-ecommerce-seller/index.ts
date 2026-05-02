import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '32-ecommerce-seller',
    url: crawlerUrl('32-ecommerce-admin'),
  });

  site.command('scrape', {
    description: '模拟淘宝卖家中心、京东商家后台。登录后查看订单列表，支持日期筛选和数据导出。',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        const data = await ctx.page.evaluate(() => {
          const orders: Array<Record<string, string>> = [];
          document
            .querySelectorAll('[class*="order"],[class*="item"],[class*="product"]')
            .forEach((el) => {
              const text = el.textContent?.trim() || '';
              if (text.length > 3) {
                orders.push({ text: text.substring(0, 200), class: el.className });
              }
            });
          const tables = Array.from(document.querySelectorAll('table')).map((table) => ({
            headers: Array.from(table.querySelectorAll('th')).map(
              (th) => th.textContent?.trim() || ''
            ),
            rows: Array.from(table.querySelectorAll('tbody tr')).map((tr) =>
              Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() || '')
            ),
          }));
          const forms = Array.from(document.querySelectorAll('form')).map((form) => ({
            action: form.action || '',
            inputs: Array.from(form.querySelectorAll('input,select')).map((el) => ({
              name: (el as HTMLInputElement).name || '',
              type: (el as HTMLInputElement).type || '',
            })),
          }));
          if (orders.length === 0 && tables.length === 0) {
            const bodyLines = document.body?.innerText?.split('\n').filter((l) => l.trim()) || [];
            return bodyLines.slice(0, 30).map((line, i) => ({ index: i, text: line }));
          }
          return [
            ...tables.map((t, i) => ({ index: i, type: 'table' as const, ...t })),
            ...orders.slice(0, 20).map((o, i) => ({ index: i, type: 'order' as const, ...o })),
            ...forms.map((f, i) => ({ index: i, type: 'form' as const, ...f })),
          ];
        });
        return ok(data, [
          `采集到 ${data.length} 个元素`,
          `表格: ${data.filter((d: any) => d.type === 'table').length}, 订单: ${data.filter((d: any) => d.type === 'order').length}, 表单: ${data.filter((d: any) => d.type === 'form').length}`,
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
