import { z } from 'zod/v4';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '19-dynamic-captcha',
    url: crawlerUrl('19-dynamic-captcha'),
  });

  site.command('scrape', {
    description: '采集动态验证码页面信息',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        const page = ctx.page;
        await safeGoto(page, site.url);
        await page.waitForSelector('#username-input', { timeout: 8000 });

        const data = await page.evaluate(() => {
          const steps: Array<{ step: string; status: string }> = [];
          document.querySelectorAll('.progress-steps .step, .progress-steps li').forEach((el) => {
            steps.push({
              step: el.textContent?.trim() ?? '',
              status: el.classList.contains('active') ? 'active' : 'inactive',
            });
          });

          const captchaContainer = document.querySelector('#dynamic-captcha-container');
          const captchaVisible =
            captchaContainer instanceof HTMLElement &&
            captchaContainer.style.display !== 'none' &&
            !captchaContainer.classList.contains('hidden');

          const formFields: Record<string, string> = {};
          document.querySelectorAll('input').forEach((input) => {
            const id = input.id || input.name || '';
            if (id) formFields[id] = input.value || input.type;
          });

          const allButtons: string[] = [];
          document.querySelectorAll('button').forEach((btn) => {
            const text = btn.textContent?.trim() ?? '';
            if (text) allButtons.push(text);
          });

          return {
            steps,
            totalInputs: document.querySelectorAll('input').length,
            formFields,
            buttons: allButtons,
            captchaAppeared: captchaVisible,
            captchaType: captchaVisible
              ? document.querySelector('#captcha-canvas')
                ? 'canvas'
                : document.querySelector('.slider-knob')
                  ? 'slider'
                  : 'text'
              : undefined,
            captchaText: captchaContainer?.textContent?.trim().slice(0, 200) ?? '',
          };
        });

        const tips = [
          `表单步骤: ${data.steps.map((s) => s.step).join(' → ')}`,
          `检测到 ${data.totalInputs} 个输入框`,
          `按钮: ${data.buttons.join(', ')}`,
        ];
        if (data.captchaAppeared) tips.push(`验证码出现: ${data.captchaType}`);

        return ok([data], tips);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });

  site.command('verify', {
    description: '验证动态验证码页面',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page)
        return {
          status: 'fail' as const,
          data: [],
          errors: [{ field: 'page', expected: '浏览器页面', actual: '无' }],
          tips: [],
        };
      try {
        const page = ctx.page;
        await safeGoto(page, site.url);
        await page.waitForSelector('#username-input', { timeout: 8000 });

        const elements = await page.evaluate(() => ({
          usernameInput: !!document.getElementById('username-input'),
          passwordInput: !!document.getElementById('password-input'),
          captchaContainer: !!document.getElementById('dynamic-captcha-container'),
          progressSteps: !!document.querySelector('.progress-steps'),
        }));

        const errors: Array<{ field: string; expected: string; actual: string }> = [];
        for (const [name, found] of Object.entries(elements)) {
          if (!found) errors.push({ field: name, expected: '存在', actual: '未找到' });
        }

        return {
          status: errors.length === 0 ? ('pass' as const) : ('fail' as const),
          data: [],
          errors,
          tips:
            errors.length === 0
              ? ['页面元素验证通过']
              : [`缺少: ${errors.map((e) => e.field).join(', ')}`],
        };
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
