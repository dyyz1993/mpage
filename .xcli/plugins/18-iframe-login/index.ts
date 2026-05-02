import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { safeGoto, ok, fail, crawlerUrl } from '../_shared';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: '18-iframe-login',
    url: crawlerUrl('18-iframe'),
  });

  site.command('scrape', {
    description: '登录框在iframe中。切换到iframe并操作内部元素。',
    scope: 'page',
    parameters: z.object({}),
    handler: async (_params, ctx) => {
      if (!ctx.page) return fail('需要浏览器页面');
      try {
        await safeGoto(ctx.page, site.url);
        const data = await ctx.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll('iframe')).map((iframe) => ({
            src: iframe.src || '',
            id: iframe.id || '',
            name: iframe.name || '',
            width: iframe.width || '',
            height: iframe.height || '',
          }));
          const forms = Array.from(document.querySelectorAll('form')).map((form) => ({
            action: form.action || '',
            method: form.method || '',
            id: form.id || '',
            inputs: Array.from(form.querySelectorAll('input')).map((inp) => ({
              name: inp.name || '',
              type: inp.type,
              placeholder: inp.placeholder || '',
            })),
          }));
          const allInputs = Array.from(document.querySelectorAll('input')).map((inp) => ({
            name: inp.name || inp.id || '',
            type: inp.type,
            placeholder: inp.placeholder || '',
          }));
          return iframes.length > 0
            ? iframes.map((f, i) => ({ index: i, ...f }))
            : forms.length > 0
              ? forms
              : allInputs.map((inp, i) => ({ index: i, ...inp }));
        });
        return ok(data, [`采集到 ${data.length} 个元素 (iframe/表单/输入框)`]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return fail(msg);
      }
    },
  });
}
