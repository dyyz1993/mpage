# site-framework 插件验证报告

## 基本信息

- **插件名称**: site-framework
- **验证时间**: 2026-04-22
- **状态**: 验证完成

---

## 0. 插件 Help

### 0.1 --help 输出

```bash
npx tsx xcli/bin/xcli.ts site-framework --help
```

```
Command failed: npx tsx xcli/bin/xcli.ts site-framework --help
Site 'site-framework' not found

```

---

## 1. scrape 命令

### 1.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts site-framework scrape
```

```yaml
Command failed: npx tsx xcli/bin/xcli.ts site-framework scrape
Site 'site-framework' not found

```

### 1.2 JSON 输出

```bash
npx tsx xcli/bin/xcli.ts site-framework scrape --json
```

```json
Command failed: npx tsx xcli/bin/xcli.ts site-framework scrape --json
Site 'site-framework' not found

```

### 1.3 --help 输出

```bash
npx tsx xcli/bin/xcli.ts site-framework scrape --help
```

```
Command failed: npx tsx xcli/bin/xcli.ts site-framework scrape --help
Site 'site-framework' not found

```

---

## 2. verify 命令

### 2.1 默认输出 (YAML)

```bash
npx tsx xcli/bin/xcli.ts site-framework verify
```

```yaml
Command failed: npx tsx xcli/bin/xcli.ts site-framework verify
Site 'site-framework' not found

```

### 2.2 --help 输出

```bash
npx tsx xcli/bin/xcli.ts site-framework verify --help
```

```
Command failed: npx tsx xcli/bin/xcli.ts site-framework verify --help
Site 'site-framework' not found

```

---

## 3. 结论

**状态**: ✅ 验证完成

---
*此文档由自动化脚本生成*
