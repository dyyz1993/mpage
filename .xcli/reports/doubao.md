# doubao 插件验证报告

## 基本信息

- **插件名称**: doubao
- **验证时间**: 2026-04-22
- **状态**: 验证完成

---

## 0. 插件 Help

### 0.1 --help 输出

```bash
npx tsx xcli/bin/xcli.ts doubao --help
```

```
doubao - https://doubao.com

Commands:
  list            列出豆包话题分类
  input           与豆包对话
  search          搜索豆包内容

Use --json for JSON output

```

---

## 1. scrape 命令

### 1.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts doubao scrape
```

```yaml
Available: list, input, search

```

### 1.2 JSON 输出

```bash
npx tsx xcli/bin/xcli.ts doubao scrape --json
```

```json
Available: list, input, search

```

### 1.3 --help 输出

```bash
npx tsx xcli/bin/xcli.ts doubao scrape --help
```

```
Available: list, input, search

```

---

## 2. verify 命令

### 2.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts doubao verify
```

```yaml
Available: list, input, search

```

### 2.2 --help 输出

```bash
npx tsx xcli/bin/xcli.ts doubao verify --help
```

```
Available: list, input, search

```

---

## 3. 结论

**状态**: ✅ 验证完成

---
*此文档由自动化脚本生成*
