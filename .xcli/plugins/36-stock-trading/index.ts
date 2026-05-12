import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '36-stock-trading',
    url: crawlerUrl('36-stock-market'),
  });

  site.command('scrape', {
    description: '模拟股票交易平台。密码+短信验证码双重认证，API数据Base64加密，Canvas绘制K线图。',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        await ctx.page.waitForSelector('#search-btn');
        await ctx.page.click('#search-btn');
        await ctx.page.waitForTimeout(2000);
        const data = await ctx.page.evaluate(async () => {
          const stockCode =
            (document.querySelector('#stock-code') as HTMLInputElement)?.value || '';

          const timestamp = Date.now().toString();
          const headers: Record<string, string> = {
            'X-Timestamp': timestamp,
            'X-Signature': '00000000',
          };
          const token = (window as Record<string, unknown>).__sessionToken as string | undefined;
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(`${window.location.origin}/examples/36/quote?code=${stockCode}`, {
            headers,
          });
          const encryptedData = await res.text();
          const binaryStr = atob(encryptedData);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const decoded = new TextDecoder('utf-8').decode(bytes);
          const q = JSON.parse(decoded);

          const orderBook = q.orderBook.map(
            (
              level: { buyPrice: number; buyVol: number; sellPrice: number; sellVol: number },
              i: number
            ) => [
              `买${5 - i} ${level.buyPrice.toFixed(2)}`,
              `${level.buyVol}手`,
              `${level.sellVol}手`,
              `卖${i + 1} ${level.sellPrice.toFixed(2)}`,
            ]
          );

          const canvasInfo = Array.from(document.querySelectorAll('canvas')).map((c) => ({
            id: c.id || '',
            width: c.width,
            height: c.height,
          }));

          return {
            stockCode: q.code || stockCode,
            name: q.name || '',
            price: `¥${q.price.toFixed(2)}`,
            change: `${q.change >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%`,
            bidPrice: q.bid.toFixed(2),
            askPrice: q.ask.toFixed(2),
            volume: q.volume,
            amount: q.amount,
            klineCount: Array.isArray(q.klines) ? q.klines.length : 0,
            orderBook,
            canvasInfo,
          };
        });
        return ok(data, [
          `股票: ${data.name} (${data.stockCode}), 价格: ${data.price}, 涨跌: ${data.change}`,
          `K线: ${data.klineCount} 条, 成交量: ${data.volume}`,
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
