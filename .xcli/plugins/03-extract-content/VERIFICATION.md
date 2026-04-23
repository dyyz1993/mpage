# 03-extract-content 插件验证报告

## 基本信息

- **插件名称**: 03-extract-content
- **验证时间**: 2026-04-22
- **状态**: 验证完成

---

## 0. 插件 Help

### 0.1 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 03-extract-content --help
```

```
03-extract-content - No URL

Commands:
  scrape          提取文章内容

Use --json for JSON output

```

---

## 1. scrape 命令

### 1.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 03-extract-content scrape --url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/03-extract-content.html"
```

```yaml
data:
  title: 深入理解Python爬虫：从入门到精通的完整指南
  author: 张三
  date: 2024-01-15
  views: 12345
  comments: 156
  cover_image: 
  content:
    -
      "什么是网络爬虫？"
    -
      "网络爬虫（Web Crawler），也被称为网络蜘蛛（Web Spider）或网络机器人，是一种自动浏览万维网的程序。
            它们系统地浏览网站，提取所需的信息，用于各种目的，如搜索引擎索引、数据挖掘、价格监控等。"
    -
      "为什么选择Python？"
    -
      "Python是爬虫开发的首选语言，原因如下："
    -
      "爬虫的基本工作流程"
    -
      "一个典型的爬虫程序包含以下步骤："
    -
      "核心代码示例"
    -
      "下面是一个简单的爬虫示例："
    -
      "处理反爬虫机制"
    -
      "现代网站通常会部署各种反爬虫机制，常见的包括："
    -
      "进阶技巧"
    -
      "当你掌握了基础爬虫技能后，可以学习以下进阶技巧："
    -
      "爬虫是一门有趣而实用的技能，希望这篇指南能帮助你快速入门。
            记住，最好的学习方式就是动手实践！"
  tags:
    -
      "Python"
    -
      "爬虫"
    -
      "Web"
    -
      "教程"
    -
      "入门指南"
💡 提取完成

```

### 1.2 JSON 输出

```bash
npx tsx xcli/bin/xcli.ts 03-extract-content scrape --url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/03-extract-content.html" --json
```

```json
{
  "data": {
    "title": "深入理解Python爬虫：从入门到精通的完整指南",
    "author": "张三",
    "date": "2024-01-15",
    "views": 12345,
    "comments": 156,
    "cover_image": "",
    "content": [
      "什么是网络爬虫？",
      "网络爬虫（Web Crawler），也被称为网络蜘蛛（Web Spider）或网络机器人，是一种自动浏览万维网的程序。\n            它们系统地浏览网站，提取所需的信息，用于各种目的，如搜索引擎索引、数据挖掘、价格监控等。",
      "为什么选择Python？",
      "Python是爬虫开发的首选语言，原因如下：",
      "爬虫的基本工作流程",
      "一个典型的爬虫程序包含以下步骤：",
      "核心代码示例",
      "下面是一个简单的爬虫示例：",
      "处理反爬虫机制",
      "现代网站通常会部署各种反爬虫机制，常见的包括：",
      "进阶技巧",
      "当你掌握了基础爬虫技能后，可以学习以下进阶技巧：",
      "爬虫是一门有趣而实用的技能，希望这篇指南能帮助你快速入门。\n            记住，最好的学习方式就是动手实践！"
    ],
    "tags": [
      "Python",
      "爬虫",
      "Web",
      "教程",
      "入门指南"
    ]
  },
  "tips": [
    "提取完成"
  ]
}

```

### 1.3 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 03-extract-content scrape --help
```

```
📌 scrape - 提取文章内容

提取文章内容

⚙️  Parameters (Zod):
--url [string] (optional)
    文章URL

📤 Result (Zod):
  data: [object] { title, author, date, views, comments, cover_image, content, tags }

📝 Examples:
  $ xcli 03-extract-content scrape --url "https://..."

    data:
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
      - "提取完成"

```

---

## 2. verify 命令

### 2.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 03-extract-content verify
```

```yaml
Available: scrape

```

### 2.2 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 03-extract-content verify --help
```

```
Available: scrape

```

---

## 3. 结论

**状态**: ✅ 验证完成

---
*此文档由自动化脚本生成*
