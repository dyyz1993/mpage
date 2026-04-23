# 01-static 插件验证报告

## 基本信息

- **插件名称**: 01-static
- **验证时间**: 2026-04-22
- **状态**: 验证完成

---

## 0. 插件 Help

### 0.1 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 01-static --help
```

```
01-static - https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/01-static.html

Commands:
  scrape          采集静态HTML页面数据
  verify          校验采集数据

Use --json for JSON output

```

---

## 1. scrape 命令

### 1.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 01-static scrape
```

```yaml
data:
  -
    title: Python爬虫入门指南（一）：初识爬虫
    url: /blog/post/python-web-scraping-101
    date: 2024-01-15
    author: 张三
    views: 1234
  -
    title: 掌握BeautifulSoup：像剥洋葱一样解析HTML
    url: /blog/post/beautifulsoup-selectors
    date: 2024-01-14
    author: 李四
    views: 856
  -
    title: 爬虫必备知识：深入理解 HTTP 请求头
    url: /blog/post/http-headers-explained
    date: 2024-01-13
    author: 王五
    views: 2105
  -
    title: 从抓取到分析：使用 Pandas 进行数据清洗
    url: /blog/post/data-cleaning-pandas
    date: 2024-01-12
    author: 赵六
    views: 1567
  -
    title: 爬虫开发的 10 个最佳实践
    url: /blog/post/crawler-best-practices
    date: 2024-01-11
    author: 张三
    views: 432
💡 采集到 5 篇文章

```

### 1.2 JSON 输出

```bash
npx tsx xcli/bin/xcli.ts 01-static scrape --json
```

```json
{
  "data": [
    {
      "title": "Python爬虫入门指南（一）：初识爬虫",
      "url": "/blog/post/python-web-scraping-101",
      "date": "2024-01-15",
      "author": "张三",
      "views": 1234
    },
    {
      "title": "掌握BeautifulSoup：像剥洋葱一样解析HTML",
      "url": "/blog/post/beautifulsoup-selectors",
      "date": "2024-01-14",
      "author": "李四",
      "views": 856
    },
    {
      "title": "爬虫必备知识：深入理解 HTTP 请求头",
      "url": "/blog/post/http-headers-explained",
      "date": "2024-01-13",
      "author": "王五",
      "views": 2105
    },
    {
      "title": "从抓取到分析：使用 Pandas 进行数据清洗",
      "url": "/blog/post/data-cleaning-pandas",
      "date": "2024-01-12",
      "author": "赵六",
      "views": 1567
    },
    {
      "title": "爬虫开发的 10 个最佳实践",
      "url": "/blog/post/crawler-best-practices",
      "date": "2024-01-11",
      "author": "张三",
      "views": 432
    }
  ],
  "tips": [
    "采集到 5 篇文章"
  ]
}

```

### 1.3 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 01-static scrape --help
```

```
📌 scrape - 采集静态HTML页面数据

采集静态HTML页面数据

⚙️  Parameters (Zod):

📤 Result (Zod):
  data: [[object] { title, url, date, author, views }]

📝 Examples:
  $ xcli 01-static scrape

    data:
      - title: "Python爬虫入门指南（一）：初识爬虫"
        url: /blog/post/python-crawler-getting-started
        date: 2024-01-15
        author: 张三
        views: 1234
    tips:
      - "采集到 5 篇文章"
  $ xcli 01-static scrape --json

    {
      "data": [
        { "title": "Python爬虫入门指南（一）：初识爬虫", "url": "/blog/post/...", "date": "2024-01-15", "author": "张三", "views": 1234 }
      ],
      "tips": ["采集到 5 篇文章"]
    }

```

---

## 2. verify 命令

### 2.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 01-static verify
```

```yaml
status: pass
data:
  -
    title: Python爬虫入门指南（一）：初识爬虫
    url: /blog/post/python-web-scraping-101
    date: 2024-01-15
    author: 张三
    views: 1234
  -
    title: 掌握BeautifulSoup：像剥洋葱一样解析HTML
    url: /blog/post/beautifulsoup-selectors
    date: 2024-01-14
    author: 李四
    views: 856
  -
    title: 爬虫必备知识：深入理解 HTTP 请求头
    url: /blog/post/http-headers-explained
    date: 2024-01-13
    author: 王五
    views: 2105
  -
    title: 从抓取到分析：使用 Pandas 进行数据清洗
    url: /blog/post/data-cleaning-pandas
    date: 2024-01-12
    author: 赵六
    views: 1567
  -
    title: 爬虫开发的 10 个最佳实践
    url: /blog/post/crawler-best-practices
    date: 2024-01-11
    author: 张三
    views: 432
errors:
  []
💡 校验通过

```

### 2.2 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 01-static verify --help
```

```
📌 verify - 校验采集数据

校验采集数据

⚙️  Parameters (Zod):

📤 Result (Zod):
  status: [ZodEnum]
  data: [[object] { title, url, date, author, views }]

📝 Examples:
  $ xcli 01-static verify

    status: pass
    data:
      - title: "Python爬虫入门指南（一）：初识爬虫"
        url: /blog/post/python-crawler-getting-started
        date: 2024-01-15
        author: 张三
        views: 1234
    errors: []
    tips:
      - "校验通过"

```

---

## 3. 结论

**状态**: ✅ 验证完成

---
*此文档由自动化脚本生成*
