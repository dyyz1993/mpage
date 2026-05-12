import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '27-real-estate',
    url: crawlerUrl('27-house-site'),
  });

  site.command('scrape', {
    description: '处理地图坐标选区、提取小区信息、历史成交价格趋势。',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        await ctx.page.waitForTimeout(2000);
        const data = await ctx.page.evaluate(() => {
          const communities = Array.from(document.querySelectorAll('.community-card')).map(
            (card) => {
              const name = card.querySelector('.community-name')?.textContent?.trim() || '';
              const address = card.querySelector('.community-address')?.textContent?.trim() || '';
              const priceMain = card.querySelector('.price-main')?.textContent?.trim() || '';
              const priceUnit = card.querySelector('.price-unit')?.textContent?.trim() || '';
              const tags = Array.from(card.querySelectorAll('.community-tag')).map(
                (t) => t.textContent?.trim() || ''
              );
              const info = Array.from(card.querySelectorAll('.community-info span')).map(
                (s) => s.textContent?.trim() || ''
              );
              const id = card.getAttribute('data-id') || '';
              return { id, name, address, priceMain, priceUnit, tags, info };
            }
          );

          const filterItems = Array.from(document.querySelectorAll('.filter-item')).map((el) => ({
            text: el.textContent?.trim() || '',
            isActive: el.classList.contains('active'),
          }));

          const mapCoords = document.querySelector('.map-coords')?.textContent?.trim() || '';

          return { communities, filterItems, mapCoords };
        });
        return ok(data, [
          `采集到 ${data.communities.length} 个小区`,
          `价格范围: ${
            data.communities
              .map((c) => c.priceMain)
              .filter(Boolean)
              .join(' ~ ') || '未提取到'
          }`,
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
