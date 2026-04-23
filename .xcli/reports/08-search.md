# 08-search

## 插件信息

- **名称**: 08-search
- **URL**: https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/08-search.html
- **描述**: 搜索结果采集插件

## 命令

### scrape

采集搜索结果数据

**参数**:
- `keyword` (string, optional): 搜索关键词，默认 "iPhone"

**示例**:
```bash
xcli 08-search scrape
xcli 08-search scrape --keyword MacBook
```

### verify

校验搜索结果数据

**参数**:
- `keyword` (string, optional): 搜索关键词，默认 "iPhone"

**示例**:
```bash
xcli 08-search verify
xcli 08-search verify --keyword MacBook
```

## 验证结果

### scrape (默认输出)

```yaml
data:
  - id: 4001
    name: iPhone 官方正品 第1代 - 旗舰款
    price: 5999
    url: https://example.com/item/4001
    snippet: 这是关于 <em>iPhone</em> 的详细描述...
  - id: 4002
    name: iPhone 官方正品 第2代 - 旗舰款
    price: 6099
    ...
💡 采集到 10 条搜索结果，总计 35 条
```

### scrape (JSON)

```json
{
  "data": [
    {
      "id": 4001,
      "name": "iPhone 官方正品 第1代 - 旗舰款",
      "price": 5999,
      "url": "https://example.com/item/4001",
      "snippet": "这是关于 <em>iPhone</em> 的详细描述..."
    }
  ],
  "tips": ["采集到 10 条搜索结果，总计 35 条"]
}
```

### verify (默认输出)

```yaml
data:
  - id: 4001
    name: iPhone 官方正品 第1代 - 旗舰款
    price: 5999
    ...
errors: []
💡 校验通过
```

### verify (JSON)

```json
{
  "data": [...],
  "errors": [],
  "tips": ["校验通过"]
}
```

## 校验标准检查

- [x] 请求格式: POST + application/json
- [x] 数据完整性: 10 条结果
- [x] name 包含搜索关键词 "iPhone"
- [x] price 是 number 类型
- [x] price >= 3000
- [x] 校验通过