import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '29-document-fragment',
    url: crawlerUrl('29-fragment'),
  });

  site.command('scrape', {
    description: '使用 Fragment 批量插入。监听 DOM 变化捕获内容。',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        await ctx.page.waitForSelector('#container .data-item', { timeout: 6000 });
        const data = await ctx.page.evaluate(async () => {
          const resp = await fetch(`${window.location.origin}/examples/29/data`);
          const result = await resp.json();
          if (!result || !result.success || !Array.isArray(result.data)) return [];
          return result.data.map(
            (item: { id: number; title: string; content: string; timestamp: string }) => ({
              id: String(item.id),
              title: item.title,
              content: item.content,
              timestamp: item.timestamp,
            })
          );
        });
        return ok(data, [`采集到 ${data.length} 条 Fragment 数据`]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
