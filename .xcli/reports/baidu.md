# baidu 插件验证报告

## 基本信息

- **插件名称**: baidu
- **验证时间**: 2026-04-22
- **状态**: 验证完成

---

## 0. 插件 Help

### 0.1 --help 输出

```bash
npx tsx xcli/bin/xcli.ts baidu --help
```

```
baidu - https://www.baidu.com

Commands:
  search          百度搜索
  hotsearch       获取百度热搜榜

Use --json for JSON output

```

---

## 1. scrape 命令

### 1.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts baidu scrape
```

```yaml
Available: search, hotsearch

```

### 1.2 JSON 输出

```bash
npx tsx xcli/bin/xcli.ts baidu scrape --json
```

```json
Available: search, hotsearch

```

### 1.3 --help 输出

```bash
npx tsx xcli/bin/xcli.ts baidu scrape --help
```

```
Available: search, hotsearch

```

---

## 2. verify 命令

### 2.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts baidu verify
```

```yaml
Available: search, hotsearch

```

### 2.2 --help 输出

```bash
npx tsx xcli/bin/xcli.ts baidu verify --help
```

```
Available: search, hotsearch

```

---

## 3. 结论

**状态**: ✅ 验证完成

---
*此文档由自动化脚本生成*
