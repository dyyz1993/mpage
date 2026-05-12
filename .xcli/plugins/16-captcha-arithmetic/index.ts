import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '16-captcha-arithmetic',
    url: crawlerUrl('16-captcha-math'),
  });

  site.command('scrape', {
    description: '计算验证码（如 3+5=?）。解析算术表达式并自动计算。',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        const data = await ctx.page.evaluate(() => {
          const results: Array<{ expression: string; answer: number | null; source: string }> = [];
          const bodyText = document.body?.innerText || '';
          const mathPattern = /(\d+)\s*([+\-×÷*/])\s*(\d+)\s*=\s*\?/g;
          let match;
          while ((match = mathPattern.exec(bodyText)) !== null) {
            const a = parseInt(match[1], 10);
            const op = match[2];
            const b = parseInt(match[3], 10);
            let answer: number | null = null;
            if (op === '+') answer = a + b;
            else if (op === '-') answer = a - b;
            else if (op === '×' || op === '*') answer = a * b;
            else if (op === '÷' || op === '/') answer = b !== 0 ? a / b : null;
            results.push({ expression: match[0], answer, source: 'text' });
          }
          document.querySelectorAll('canvas').forEach((canvas) => {
            results.push({
              expression: '(canvas captcha - requires OCR)',
              answer: null,
              source: canvas.toDataURL().substring(0, 50),
            });
          });
          if (results.length === 0) {
            const spans = document.querySelectorAll('span, div, p, label');
            spans.forEach((el) => {
              const text = el.textContent?.trim() || '';
              if (/[\d]+\s*[+\-*/]\s*[\d]+/.test(text)) {
                results.push({ expression: text, answer: null, source: 'element' });
              }
            });
          }
          return results;
        });
        return ok(data, [
          `采集到 ${data.length} 个算术表达式`,
          `题目: ${data.map((d) => d.expression).join(', ')}`,
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
