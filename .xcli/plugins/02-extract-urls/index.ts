import { z } from 'zod';
import type { XCLIAPI } from 'xcli';

const linkSchema = z.object({
  text: z.string().describe('链接文本'),
  url: z.string().describe('链接地址'),
  type: z.enum(['内部链接', '外部链接']).describe('链接类型'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '02-extract-urls',
    url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/02-extract-urls.html',
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '提取页面所有链接',
    parameters: z.object({}),
    result: z.object({
      data: z.array(linkSchema),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 02-extract-urls scrape',
        output: `data:
  - text: "← 返回列表"
    url: /tools/crawler-practice/index.html
    type: 内部链接
  - text: "GPT-5即将发布：OpenAI宣布新一代AI模型突破性进展"
    url: /news/2024/ai-breakthrough-gpt5
    type: 内部链接
tips:
  - "采集到 15 个链接"`,
      },
      {
        cmd: 'xcli 02-extract-urls scrape --json',
        output: `{
  "data": [
    { "text": "← 返回列表", "url": "/tools/crawler-practice/index.html", "type": "内部链接" }
  ],
  "tips": ["采集到 15 个链接"]
}`,
      },
    ],
    handler: async (_params, ctx) => {
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/02-extract-urls.html'
      );
      await ctx.page.waitForSelector('a');

      const links = await ctx.page.evaluate(() => {
        const results: Array<{ text: string; url: string; type: '内部链接' | '外部链接' }> = [];
        const anchorTags = document.querySelectorAll('a');
        anchorTags.forEach((a) => {
          const text = a.textContent?.trim() || '';
          const href = a.getAttribute('href') || '';
          if (!href || href === '#') return;

          const isInternal =
            href.startsWith('/') || (!href.startsWith('http://') && !href.startsWith('https://'));
          results.push({
            text,
            url: href,
            type: isInternal ? '内部链接' : '外部链接',
          });
        });
        return results;
      });

      return {
        data: links,
        tips: [`采集到 ${links.length} 个链接`],
      };
    },
  });

  plugin.command('verify', {
    description: '校验链接提取结果',
    parameters: z.object({}),
    result: z.object({
      status: z.enum(['pass', 'fail']),
      data: z.array(linkSchema),
      errors: z.array(z.object({ field: z.string(), expected: z.string(), actual: z.string() })),
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 02-extract-urls verify',
        output: `status: pass
data:
  - text: "← 返回列表"
    url: /tools/crawler-practice/index.html
    type: 内部链接
errors: []
tips:
  - "校验通过"`,
      },
    ],
    handler: async (_params, ctx) => {
      await ctx.page.goto(
        'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/02-extract-urls.html'
      );
      await ctx.page.waitForSelector('a');

      const data = await ctx.page.evaluate(() => {
        const results: Array<{ text: string; url: string; type: '内部链接' | '外部链接' }> = [];
        const anchorTags = document.querySelectorAll('a');
        anchorTags.forEach((a) => {
          const text = a.textContent?.trim() || '';
          const href = a.getAttribute('href') || '';
          if (!href || href === '#') return;

          const isInternal =
            href.startsWith('/') || (!href.startsWith('http://') && !href.startsWith('https://'));
          results.push({
            text,
            url: href,
            type: isInternal ? '内部链接' : '外部链接',
          });
        });
        return results;
      });

      const errors: Array<{ field: string; expected: string; actual: string }> = [];

      if (!Array.isArray(data))
        errors.push({ field: 'data', expected: 'array', actual: typeof data });
      if (data.length < 20)
        errors.push({ field: 'length', expected: '>=20', actual: String(data.length) });

      data.forEach((item: any, i: number) => {
        if (typeof item.text !== 'string' || item.text.trim() === '')
          errors.push({
            field: `[${i}].text`,
            expected: 'non-empty string',
            actual: String(item.text),
          });
        if (typeof item.url !== 'string')
          errors.push({ field: `[${i}].url`, expected: 'string', actual: String(item.url) });
        if (item.type !== '内部链接' && item.type !== '外部链接')
          errors.push({
            field: `[${i}].type`,
            expected: '"内部链接" or "外部链接"',
            actual: String(item.type),
          });
      });

      const gpt5Link = data.find((l: any) => l.text.includes('GPT-5即将发布'));
      if (gpt5Link && gpt5Link.type !== '内部链接')
        errors.push({
          field: '[GPT-5]',
          expected: 'type = "内部链接"',
          actual: `type = "${gpt5Link.type}"`,
        });

      const spacexLink = data.find((l: any) => l.text.includes('SpaceX'));
      if (spacexLink && spacexLink.type !== '外部链接')
        errors.push({
          field: '[SpaceX]',
          expected: 'type = "外部链接"',
          actual: `type = "${spacexLink.type}"`,
        });

      const status = errors.length === 0 ? 'pass' : 'fail';
      const tips = status === 'pass' ? ['校验通过'] : [`发现 ${errors.length} 个问题`];

      return { status, data, errors, tips };
    },
  });
}
