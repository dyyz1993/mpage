import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '20-comprehensive',
    url: crawlerUrl('20-complex'),
  });

  site.command('scrape', {
    description: '组合登录+Session+验证码+限流。综合运用各种技术设计稳定爬虫。',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        const data = await ctx.page.evaluate(() => {
          const mechanisms = Array.from(document.querySelectorAll('.mechanism-item')).map((el) => {
            const name = el.querySelector('.mechanism-name')?.textContent?.trim() || '';
            const statusEl = el.querySelector('.mechanism-status');
            const status = statusEl?.textContent?.trim() || '';
            const isActive = statusEl?.classList.contains('active') || false;
            return { name, status, isActive };
          });

          const formInputs = Array.from(document.querySelectorAll('.form-input')).map((el) => {
            const input = el as HTMLInputElement;
            return {
              id: input.id || '',
              type: input.type || '',
              placeholder: input.placeholder || '',
              value: input.value || '',
            };
          });

          const captchaCode = document.querySelector('#captcha-display')?.textContent?.trim() || '';
          const loginBtnText = document.querySelector('#login-btn')?.textContent?.trim() || '';

          const stats = {
            requestCount: document.querySelector('#request-count')?.textContent?.trim() || '0',
            failCount: document.querySelector('#fail-count')?.textContent?.trim() || '0',
            sessionStatus: document.querySelector('#session-status')?.textContent?.trim() || '',
            rateStatus: document.querySelector('#rate-status')?.textContent?.trim() || '',
          };

          const navLinks = Array.from(document.querySelectorAll('.navbar a[href]')).map((a) => ({
            text: a.textContent?.trim() || '',
            href: (a as HTMLAnchorElement).href,
          }));

          return {
            mechanisms,
            formInputs,
            captchaCode,
            loginBtnText,
            stats,
            navLinks,
          };
        });
        return ok(data, [
          `防御机制: ${data.mechanisms.length} 个, 表单输入: ${data.formInputs.length} 个`,
          `导航链接: ${data.navLinks.length} 个, 验证码: ${data.captchaCode || '无'}`,
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
