import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '33-government-tender',
    url: crawlerUrl('33-government-bidding'),
  });

  site.command('scrape', {
    description: '模拟政府采购网。滑块验证登录后搜索招标公告，部分内容需要登录才能查看。',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        const data = await ctx.page.evaluate(() => {
          const tenders: Array<Record<string, string>> = [];
          document
            .querySelectorAll(
              '[class*="tender"],[class*="bid"],[class*="notice"],[class*="announce"]'
            )
            .forEach((el) => {
              const text = el.textContent?.trim() || '';
              if (text.length > 3) {
                tenders.push({ text: text.substring(0, 200), class: el.className });
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
          const links = Array.from(document.querySelectorAll('a[href]')).map((a) => ({
            text: a.textContent?.trim() || '',
            href: (a as HTMLAnchorElement).href,
          }));
          if (tenders.length === 0 && tables.length === 0) {
            const bodyLines = document.body?.innerText?.split('\n').filter((l) => l.trim()) || [];
            return bodyLines.slice(0, 30).map((line, i) => ({ index: i, text: line }));
          }
          return [
            ...tenders.slice(0, 20).map((t, i) => ({ index: i, type: 'tender' as const, ...t })),
            ...tables.map((t, i) => ({ index: i, type: 'table' as const, ...t })),
            ...links.slice(0, 10).map((l, i) => ({ index: i, type: 'link' as const, ...l })),
          ];
        });
        return ok(data, [
          `采集到 ${data.length} 个元素`,
          `招标: ${data.filter((d: any) => d.type === 'tender').length}, 表格: ${data.filter((d: any) => d.type === 'table').length}, 链接: ${data.filter((d: any) => d.type === 'link').length}`,
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
