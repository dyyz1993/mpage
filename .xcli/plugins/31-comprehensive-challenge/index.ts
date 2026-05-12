import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '31-comprehensive-challenge',
    url: crawlerUrl('31-ultimate'),
  });

  site.command('scrape', {
    description: '组合Shadow DOM+虚拟滚动+CSS-in-JS+Portal+XHR+WebSocket。综合运用所有技术！',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        await ctx.page.waitForTimeout(3000);
        const data = await ctx.page.evaluate(() => {
          const shadowUsers: Array<{
            name: string;
            role: string;
            avatar: string;
          }> = [];
          document.querySelectorAll('.user-card-wrapper').forEach((el) => {
            const sr = el.shadowRoot;
            if (!sr) return;
            const name = sr.querySelector('.user-name')?.textContent?.trim() || '';
            const role = sr.querySelector('.user-role')?.textContent?.trim() || '';
            const avatar = sr.querySelector('.user-avatar')?.getAttribute('src') || '';
            shadowUsers.push({ name, role, avatar });
          });

          const products = Array.from(document.querySelectorAll('.product-item')).map((el) => ({
            id: el.getAttribute('data-id') || '',
            name: el.querySelector('.product-name')?.textContent?.trim() || '',
            price: el.querySelector('.product-price')?.textContent?.trim() || '',
            stock: el.querySelector('.product-stock')?.textContent?.trim() || '',
          }));

          const detailButtons = Array.from(
            document.querySelectorAll('[data-action="view-detail"]')
          ).map((btn) => ({
            id: btn.getAttribute('data-detail-id') || '',
            label: btn.getAttribute('aria-label') || '',
            text: btn.textContent?.trim() || '',
          }));

          const stats = {
            onlineUsers: document.querySelector('#online-users')?.textContent?.trim() || '--',
            transactions: document.querySelector('#transactions')?.textContent?.trim() || '--',
          };

          const techTags = Array.from(document.querySelectorAll('.tech-tag')).map(
            (t) => t.textContent?.trim() || ''
          );

          return { shadowUsers, products, detailButtons, stats, techTags };
        });
        return ok(data, [
          `Shadow用户: ${data.shadowUsers.length} 个, 商品: ${data.products.length} 个`,
          `技术标签: ${data.techTags.length} 个, 在线: ${data.stats.onlineUsers}, 交易: ${data.stats.transactions}`,
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
