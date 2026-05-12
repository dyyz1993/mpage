import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '12-captcha-numeric',
    url: crawlerUrl('12-captcha-image'),
  });

  site.command('scrape', {
    description: 'Canvas生成简单数字+字母验证码。识别验证码或使用OCR工具。',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        const data = await ctx.page.evaluate(() => {
          const captchas: Array<{ type: string; src: string; text: string }> = [];
          document.querySelectorAll('canvas').forEach((canvas) => {
            captchas.push({
              type: 'canvas',
              src: canvas.toDataURL(),
              text: canvas.getAttribute('data-code') || '',
            });
          });
          document.querySelectorAll('img').forEach((img) => {
            if (img.src && (img.src.includes('captcha') || img.alt?.includes('验证码'))) {
              captchas.push({ type: 'image', src: img.src, text: img.alt || '' });
            }
          });
          document.querySelectorAll('svg').forEach((svg) => {
            if (svg.closest('[class*="captcha"]') || svg.closest('[id*="captcha"]')) {
              captchas.push({ type: 'svg', src: svg.outerHTML, text: '' });
            }
          });
          const inputs = Array.from(document.querySelectorAll('input')).map((el) => ({
            name: el.name || el.id || '',
            type: el.type,
            placeholder: el.placeholder || '',
          }));
          return captchas.length > 0
            ? captchas.map((c, i) => ({ ...c, index: i }))
            : inputs.map((inp, i) => ({ type: 'input', index: i, ...inp }));
        });
        return ok(data, [
          `采集到 ${data.length} 个验证码元素, 类型: ${data.map((d) => d.type).join(', ')}`,
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
