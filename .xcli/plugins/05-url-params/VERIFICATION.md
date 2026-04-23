# 05-url-params 插件验证报告

## 基本信息

- **插件名称**: 05-url-params
- **验证时间**: 2026-04-22
- **状态**: 验证完成

---

## 0. 插件 Help

### 0.1 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 05-url-params --help
```

```
05-url-params - No URL

Commands:
  scrape          通过URL参数采集商品数据

Use --json for JSON output

```

---

## 1. scrape 命令

### 1.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 05-url-params scrape --base_url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/05-url-params.html" --category electronics --price_min 500 --price_max 2000 --sort sales_desc --pages 1
```

```yaml
data:
  total: 4
  products:
    -
      name: Keychron K2 - Model 9
      price: 500
      sales: 1300
      rating: ★★★★☆
      category: 电子产品
    -
      name: Logitech MX Master 3S - Model 10
      price: 550
      sales: 1400
      rating: ★★★★☆
      category: 电子产品
    -
      name: Dell U2723QE - Model 11
      price: 600
      sales: 1500
      rating: ★★★★☆
      category: 电子产品
    -
      name: Anker Hub - Model 12
      price: 650
      sales: 1600
      rating: ★★★★★
      category: 电子产品
💡 采集完成，共 1 页 4 条数据

```

### 1.2 JSON 输出

```bash
npx tsx xcli/bin/xcli.ts 05-url-params scrape --base_url "https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/05-url-params.html" --category electronics --price_min 500 --price_max 2000 --sort sales_desc --pages 1 --json
```

```json
{
  "data": {
    "total": 4,
    "products": [
      {
        "name": "Keychron K2 - Model 9",
        "price": 500,
        "sales": 1300,
        "rating": "★★★★☆",
        "category": "电子产品"
      },
      {
        "name": "Logitech MX Master 3S - Model 10",
        "price": 550,
        "sales": 1400,
        "rating": "★★★★☆",
        "category": "电子产品"
      },
      {
        "name": "Dell U2723QE - Model 11",
        "price": 600,
        "sales": 1500,
        "rating": "★★★★★",
        "category": "电子产品"
      },
      {
        "name": "Anker Hub - Model 12",
        "price": 650,
        "sales": 1600,
        "rating": "★★★★☆",
        "category": "电子产品"
      }
    ]
  },
  "tips": [
    "采集完成，共 1 页 4 条数据"
  ]
}

```

### 1.3 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 05-url-params scrape --help
```

```
📌 scrape - 通过URL参数采集商品数据

通过URL参数采集商品数据

⚙️  Parameters (Zod):
--base_url [string] (optional)
    目标URL
--category [any] (optional)
    分类
--price_min [any] (optional)
    最低价格
--price_max [any] (optional)
    最高价格
--sort [any] (optional)
    排序方式
--pages [any] (optional)
    采集页数

📤 Result (Zod):
  data: [object] { total, products }

📝 Examples:
  $ xcli 05-url-params scrape --base_url "https://..." --category electronics --price_min 500 --price_max 2000 --sort sales_desc --pages 2

    data:
      total: 20
      products:
        - name: "高性能游戏笔记本"
          price: 1999
          sales: 5000
          rating: "★★★★★"
          category: "电子产品"
        - ...
    💡 采集完成，共 2 页 20 条数据

```

---

## 2. verify 命令

### 2.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts 05-url-params verify
```

```yaml
Available: scrape

```

### 2.2 --help 输出

```bash
npx tsx xcli/bin/xcli.ts 05-url-params verify --help
```

```
Available: scrape

```

---

## 3. 结论

**状态**: ✅ 验证完成

---
*此文档由自动化脚本生成*
