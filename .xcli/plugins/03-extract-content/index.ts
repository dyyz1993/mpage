import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { crawlerUrl } from '../_shared';

const articleSchema = z.object({
  title: z.string().describe('文章标题'),
  author: z.string().describe('作者'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('发布日期'),
  views: z.number().int().nonnegative().describe('阅读数'),
  comments: z.number().int().nonnegative().describe('评论数'),
  cover_image: z.string().optional().describe('封面图片链接'),
  content: z.array(z.string()).describe('正文内容'),
  tags: z.array(z.string()).describe('文章标签'),
});

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: '03-extract-content',
    url: crawlerUrl('03-extract-content'),
    requiresLogin: false,
  });

  plugin.command('scrape', {
    description: '提取文章内容',
    parameters: z.object({
      url: z.string().url().optional().default(crawlerUrl('03-extract-content')),
    }),
    result: z.object({
      data: articleSchema,
      tips: z.array(z.string()).optional().default([]),
    }),
    examples: [
      {
        cmd: 'xcli 03-extract-content scrape --url "https://..."',
        output: `data:
  title: "深入理解Python爬虫：从入门到精通的完整指南"
  author: 张三
  date: 2024-01-15
  views: 12345
  comments: 156
  cover_image: ""
  content:
    - "什么是网络爬虫？"
    - "网络爬虫（Web Crawler）..."
    - ...
  tags:
    - Python
    - 爬虫
    - Web Scraping
    - 教程
    - 入门指南
tips:
  - "提取完成"`,
      },
    ],
    handler: async (params, ctx) => {
      await ctx.page.goto(params.url);
      await ctx.page.waitForSelector('.simulation-area');

      const data = await ctx.page.evaluate(() => {
        const simArea = document.querySelector('.simulation-area');
        if (!simArea) return null;

        const title = simArea.querySelector('h1')?.textContent?.trim() || '';

        const spans = simArea.querySelectorAll('span');
        let author = '';
        let date = '';
        let views = 0;
        let comments = 0;

        spans.forEach((span) => {
          const text = span.textContent?.trim() || '';
          if (text.includes('👤')) {
            author = span.nextElementSibling?.textContent?.trim() || '';
          } else if (text.includes('📅')) {
            const dateMatch = span.nextElementSibling?.textContent?.match(/\d{4}-\d{2}-\d{2}/);
            date = dateMatch ? dateMatch[0] : '';
          } else if (text.includes('👁️')) {
            const viewsMatch = span.nextElementSibling?.textContent?.replace(/[^\d]/g, '');
            views = parseInt(viewsMatch || '0', 10);
          } else if (text.includes('💬')) {
            const commentsMatch = span.nextElementSibling?.textContent?.replace(/[^\d]/g, '');
            comments = parseInt(commentsMatch || '0', 10);
          }
        });

        const tags: string[] = [];
        const fullText = simArea.innerText;
        const tagMatches = fullText.match(/#([^\s#]+)/g);
        if (tagMatches) {
          tagMatches.forEach((tag: string) => {
            const clean = tag.replace(/^#/, '').trim();
            if (clean) tags.push(clean);
          });
        }

        const content: string[] = [];
        simArea.querySelectorAll('p, h2').forEach((el) => {
          const text = el.textContent?.trim();
          if (text && !text.startsWith('#')) {
            content.push(text);
          }
        });

        return { title, author, date, views, comments, cover_image: '', content, tags };
      });

      if (!data) {
        return {
          data: {
            title: '',
            author: '',
            date: '',
            views: 0,
            comments: 0,
            cover_image: '',
            content: [],
            tags: [],
          },
          tips: ['未找到文章内容'],
        };
      }

      return {
        data,
        tips: [
          `文章: ${data.title}`,
          `作者: ${data.author}, 标签: ${data.tags.length} 个, 正文: ${data.content.length} 段`,
        ],
      };
    },
  });
}
