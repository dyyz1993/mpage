import { z } from 'zod/v4';
import type { XCLIAPI } from '@dyyz1993/xcli-core';
import { ok, fail, scrapeDynamicCase, buildTips } from '../_shared/index.js';

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 't-mobile',
    url: 'http://localhost:3000/crawler-practice/dynamic',
  });

  site.command('scrape', {
    description: '采集 mobile 模板数据',
    parameters: z.object({
      caseId: z.string(),
    }),
    handler: async (params, ctx) => {
      if (!ctx?.page) return fail('ctx.page 不可用');
      const result = await scrapeDynamicCase(ctx.page, params.caseId);
      if (!result.data) return fail(result.error || '采集失败');

      const tips = [`数据来源: ${result.source}`, ...buildTips(result.data)];
      return ok(result.data, tips);
    },
  });
}
