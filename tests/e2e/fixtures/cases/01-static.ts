import { z } from 'zod';

export const articleSchema = z.object({
  title: z.string().describe('文章标题'),
  url: z.string().describe('文章链接'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('发布日期'),
  author: z.string().describe('作者'),
  views: z.number().int().nonnegative().describe('阅读数'),
});

export const expectedData = [
  {
    title: 'Python爬虫入门指南（一）：初识爬虫',
    url: '/blog/post/python-crawler-getting-started',
    date: '2024-01-15',
    author: '张三',
    views: 1234,
  },
  {
    title: 'Python爬虫入门指南（二）：常用库介绍',
    url: '/blog/post/python-crawler-libraries',
    date: '2024-01-16',
    author: '李四',
    views: 2345,
  },
  {
    title: 'Python爬虫入门指南（三）：实战案例',
    url: '/blog/post/python-crawler-practice',
    date: '2024-01-17',
    author: '王五',
    views: 3456,
  },
  {
    title: 'Python爬虫入门指南（四）：数据存储',
    url: '/blog/post/python-crawler-storage',
    date: '2024-01-18',
    author: '赵六',
    views: 4567,
  },
  {
    title: 'Python爬虫入门指南（五）：反爬虫技术',
    url: '/blog/post/python-crawler-anti-spider',
    date: '2024-01-19',
    author: '钱七',
    views: 5678,
  },
];

export const testCase = {
  id: '01-static',
  name: '静态HTML页面读取',
  url: 'https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/01-static.html',
  schema: articleSchema,
  expectedData,
  validate: (data: unknown[]) => {
    const errors: Array<{ field: string; expected: string; actual: string }> = [];

    if (!Array.isArray(data)) {
      errors.push({ field: 'data', expected: 'array', actual: typeof data });
      return errors;
    }

    if (data.length !== expectedData.length) {
      errors.push({
        field: 'length',
        expected: String(expectedData.length),
        actual: String(data.length),
      });
    }

    expectedData.forEach((expected, i) => {
      const actual = data[i] as any;
      if (!actual) {
        errors.push({ field: `[${i}]`, expected: 'exists', actual: 'undefined' });
        return;
      }

      if (actual.title !== expected.title) {
        errors.push({
          field: `[${i}].title`,
          expected: expected.title,
          actual: actual.title || '',
        });
      }
      if (actual.url !== expected.url) {
        errors.push({
          field: `[${i}].url`,
          expected: expected.url,
          actual: actual.url || '',
        });
      }
      if (actual.date !== expected.date) {
        errors.push({
          field: `[${i}].date`,
          expected: expected.date,
          actual: actual.date || '',
        });
      }
      if (actual.author !== expected.author) {
        errors.push({
          field: `[${i}].author`,
          expected: expected.author,
          actual: actual.author || '',
        });
      }
      if (actual.views !== expected.views) {
        errors.push({
          field: `[${i}].views`,
          expected: String(expected.views),
          actual: String(actual.views || 0),
        });
      }
    });

    return errors;
  },
};
