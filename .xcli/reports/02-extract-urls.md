# 02-extract-urls 插件验证报告

## 基本信息

- **插件名称**: 02-extract-urls
- **验证时间**: 2026-04-22
- **状态**: 验证完成

---

## 0. 插件 Help

### 0.1 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 02-extract-urls --help
```

```
02-extract-urls - https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/02-extract-urls.html

Commands:
  scrape          提取页面所有链接
  verify          校验链接提取结果

Use --json for JSON output

```

---

## 1. scrape 命令

### 1.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 02-extract-urls scrape
```

```yaml
data:
  -
    text: ← 返回列表
    url: /tools/crawler-practice/index.html
    type: 内部链接
  -
    text: ← 上一个
    url: 01-static.html
    type: 内部链接
  -
    text: 下一个 →
    url: 03-extract-content.html
    type: 内部链接
  -
    text: GPT-5即将发布：OpenAI宣布新一代AI模型突破性进展
    url: /news/2024/ai-breakthrough-gpt5
    type: 内部链接
  -
    text: 量子计算新里程碑：IBM实现1000量子比特处理器
    url: /news/2024/quantum-computing-milestone
    type: 内部链接
  -
    text: SpaceX星舰第四次试飞成功，马斯克发推庆祝
    url: https://external-tech-site.com/spaceX-starship-success
    type: 外部链接
  -
    text: 更多AI新闻
    url: /ai
    type: 内部链接
  -
    text: TechCrunch
    url: https://tech-crunch.example.com
    type: 外部链接
  -
    text: 量子专题
    url: /topics/quantum
    type: 内部链接
  -
    text: Rust 2.0正式发布：带来重大性能改进
    url: /dev/rust-20-released
    type: 内部链接
  -
    text: JavaScript ES2024新特性详解
    url: ../javascript/es2024-features
    type: 内部链接
  -
    text: WebAssembly：Web开发的未来
    url: /dev/webassembly-future
    type: 内部链接
  -
    text: iOS 18隐藏功能盘点：这10个特性你必须知道
    url: /mobile/ios18-features
    type: 内部链接
  -
    text: Android 15更新推送：这些机型率先获得
    url: /mobile/android15-update
    type: 内部链接
  -
    text: 5G网络覆盖率达90%：全球5G发展报告
    url: https://www.example-mobile-news.com/5g-coverage
    type: 外部链接
💡 采集到 15 个链接

```

### 1.2 JSON 输出

```bash
npx tsx xcli/bin/xcli.ts 02-extract-urls scrape --json
```

```json
{
  "data": [
    {
      "text": "← 返回列表",
      "url": "/tools/crawler-practice/index.html",
      "type": "内部链接"
    },
    {
      "text": "← 上一个",
      "url": "01-static.html",
      "type": "内部链接"
    },
    {
      "text": "下一个 →",
      "url": "03-extract-content.html",
      "type": "内部链接"
    },
    {
      "text": "GPT-5即将发布：OpenAI宣布新一代AI模型突破性进展",
      "url": "/news/2024/ai-breakthrough-gpt5",
      "type": "内部链接"
    },
    {
      "text": "量子计算新里程碑：IBM实现1000量子比特处理器",
      "url": "/news/2024/quantum-computing-milestone",
      "type": "内部链接"
    },
    {
      "text": "SpaceX星舰第四次试飞成功，马斯克发推庆祝",
      "url": "https://external-tech-site.com/spaceX-starship-success",
      "type": "外部链接"
    },
    {
      "text": "更多AI新闻",
      "url": "/ai",
      "type": "内部链接"
    },
    {
      "text": "TechCrunch",
      "url": "https://tech-crunch.example.com",
      "type": "外部链接"
    },
    {
      "text": "量子专题",
      "url": "/topics/quantum",
      "type": "内部链接"
    },
    {
      "text": "Rust 2.0正式发布：带来重大性能改进",
      "url": "/dev/rust-20-released",
      "type": "内部链接"
    },
    {
      "text": "JavaScript ES2024新特性详解",
      "url": "../javascript/es2024-features",
      "type": "内部链接"
    },
    {
      "text": "WebAssembly：Web开发的未来",
      "url": "/dev/webassembly-future",
      "type": "内部链接"
    },
    {
      "text": "iOS 18隐藏功能盘点：这10个特性你必须知道",
      "url": "/mobile/ios18-features",
      "type": "内部链接"
    },
    {
      "text": "Android 15更新推送：这些机型率先获得",
      "url": "/mobile/android15-update",
      "type": "内部链接"
    },
    {
      "text": "5G网络覆盖率达90%：全球5G发展报告",
      "url": "https://www.example-mobile-news.com/5g-coverage",
      "type": "外部链接"
    }
  ],
  "tips": [
    "采集到 15 个链接"
  ]
}

```

### 1.3 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 02-extract-urls scrape --help
```

```
📌 scrape - 提取页面所有链接

提取页面所有链接

⚙️  Parameters (Zod):

📤 Result (Zod):
  data: [[object] { text, url, type }]

📝 Examples:
  $ xcli 02-extract-urls scrape

    data:
      - text: "← 返回列表"
        url: /tools/crawler-practice/index.html
        type: 内部链接
      - text: "GPT-5即将发布：OpenAI宣布新一代AI模型突破性进展"
        url: /news/2024/ai-breakthrough-gpt5
        type: 内部链接
    tips:
      - "采集到 15 个链接"
  $ xcli 02-extract-urls scrape --json

    {
      "data": [
        { "text": "← 返回列表", "url": "/tools/crawler-practice/index.html", "type": "内部链接" }
      ],
      "tips": ["采集到 15 个链接"]
    }

```

---

## 2. verify 命令

### 2.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 02-extract-urls verify
```

```yaml
status: fail
data:
  -
    text: ← 返回列表
    url: /tools/crawler-practice/index.html
    type: 内部链接
  -
    text: ← 上一个
    url: 01-static.html
    type: 内部链接
  -
    text: 下一个 →
    url: 03-extract-content.html
    type: 内部链接
  -
    text: GPT-5即将发布：OpenAI宣布新一代AI模型突破性进展
    url: /news/2024/ai-breakthrough-gpt5
    type: 内部链接
  -
    text: 量子计算新里程碑：IBM实现1000量子比特处理器
    url: /news/2024/quantum-computing-milestone
    type: 内部链接
  -
    text: SpaceX星舰第四次试飞成功，马斯克发推庆祝
    url: https://external-tech-site.com/spaceX-starship-success
    type: 外部链接
  -
    text: 更多AI新闻
    url: /ai
    type: 内部链接
  -
    text: TechCrunch
    url: https://tech-crunch.example.com
    type: 外部链接
  -
    text: 量子专题
    url: /topics/quantum
    type: 内部链接
  -
    text: Rust 2.0正式发布：带来重大性能改进
    url: /dev/rust-20-released
    type: 内部链接
  -
    text: JavaScript ES2024新特性详解
    url: ../javascript/es2024-features
    type: 内部链接
  -
    text: WebAssembly：Web开发的未来
    url: /dev/webassembly-future
    type: 内部链接
  -
    text: iOS 18隐藏功能盘点：这10个特性你必须知道
    url: /mobile/ios18-features
    type: 内部链接
  -
    text: Android 15更新推送：这些机型率先获得
    url: /mobile/android15-update
    type: 内部链接
  -
    text: 5G网络覆盖率达90%：全球5G发展报告
    url: https://www.example-mobile-news.com/5g-coverage
    type: 外部链接
errors:
  -
    field: length
    expected: >=20
    actual: 15
💡 发现 1 个问题

```

### 2.2 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 02-extract-urls verify --help
```

```
📌 verify - 校验链接提取结果

校验链接提取结果

⚙️  Parameters (Zod):

📤 Result (Zod):
  status: [ZodEnum]
  data: [[object] { text, url, type }]

📝 Examples:
  $ xcli 02-extract-urls verify

    status: pass
    data:
      - text: "← 返回列表"
        url: /tools/crawler-practice/index.html
        type: 内部链接
    errors: []
    tips:
      - "校验通过"

```

---

## 3. 结论

**状态**: ✅ 验证完成

---
*此文档由自动化脚本生成*
