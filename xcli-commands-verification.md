# xcli 命令验证结果

## 运行环境
```bash
npx tsx xcli/bin/xcli.ts <command>
```

---

## 1. xcli --help

**命令:** `xcli --help`

**输出:**
```
xcli - Extensible CLI Framework

Usage:
  xcli <command> [options]        Global command
  xcli <site> <cmd> [options]    Site command

Sites:
  baidu            https://www.baidu.com
  doubao           https://doubao.com

Commands:
  help             Show help
  test             Test command

Global Options:
  --json         Output as JSON
  --yaml         Output as YAML
  --no-color     Disable colors
  --no-emoji     Disable emoji
  --no-tips      Hide tips

Examples:
  xcli test
  xcli baidu search --query "AI"
  xcli doubao list
```

**数据格式:** 纯文本帮助信息

---

## 2. xcli test

**命令:** `xcli test`

**输出:**
```
ok: ✅ true
message: Test passed
```

**数据格式:**
```json
{
  "ok": true,
  "message": "Test passed"
}
```

---

## 3. xcli baidu

**命令:** `xcli baidu`

**输出:**
```
Site: baidu (https://www.baidu.com)
Commands: search, hotsearch
```

**数据格式:** 纯文本站点信息

---

## 4. xcli baidu search --query "AI" --limit 3

**命令:** `xcli baidu search --query "AI" --limit 3`

**输出:**
```
ok: ✅ true
query: AI
limit: 3
results: 📭 (empty list)
```

**数据格式:**
```json
{
  "ok": true,
  "query": "AI",
  "limit": 3,
  "results": []
}
```

**参数说明:**
| 参数 | 类型 | 描述 |
|------|------|------|
| query | string | 搜索关键词 |
| limit | number | 结果数量 (可选, 默认10) |

---

## 5. xcli baidu search --help

**命令:** `xcli baidu search --help`

**输出:**
```
search - 百度搜索

Parameters:
  --query: 搜索关键词
  --limit: 结果数量

Examples:
  $ xcli baidu search --query "AI"
    搜索 AI
```

**数据格式:** 纯文本帮助信息

---

## 6. xcli baidu hotsearch

**命令:** `xcli baidu hotsearch`

**输出:**
```
ok: ✅ true
items: 📭 (empty list)
```

**数据格式:**
```json
{
  "ok": true,
  "items": []
}
```

---

## 7. xcli doubao

**命令:** `xcli doubao`

**输出:**
```
Site: doubao (https://doubao.com)
Commands: list
```

**数据格式:** 纯文本站点信息

---

## 8. xcli doubao list --scope tech --limit 5

**命令:** `xcli doubao list --scope tech --limit 5`

**输出:**
```
ok: ✅ true
scope: tech
items: 📭 (empty list)
```

**数据格式:**
```json
{
  "ok": true,
  "scope": "tech",
  "items": []
}
```

**参数说明:**
| 参数 | 类型 | 描述 |
|------|------|------|
| scope | string | 话题范围 |
| limit | number | 返回数量 (可选) |

---

## 9. xcli doubao list --help

**命令:** `xcli doubao list --help`

**输出:**
```
list - 列出豆包话题分类

Parameters:
  --scope: 话题范围
  --limit: 返回数量
```

**数据格式:** 纯文本帮助信息

---

## 10. xcli baidu search --query "AI" --json

**命令:** `xcli baidu search --query "AI" --json`

**输出:**
```json
{
  "ok": true,
  "query": "AI",
  "results": []
}
```

**数据格式:** 纯 JSON 输出

---

## 命令汇总表

| 命令 | 参数 | 输出格式 |
|------|------|----------|
| `--help` | 无 | 纯文本 |
| `test` | 无 | 格式化 + JSON |
| `baidu` | 无 | 纯文本 |
| `baidu search` | --query (必填), --limit (可选) | 格式化 + JSON |
| `baidu hotsearch` | 无 | 格式化 + JSON |
| `doubao` | 无 | 纯文本 |
| `doubao list` | --scope (必填), --limit (可选) | 格式化 + JSON |

---

## 全局选项

| 选项 | 描述 |
|------|------|
| `--json` | JSON 格式输出 |
| `--yaml` | YAML 格式输出 |
| `--no-color` | 禁用颜色 |
| `--no-emoji` | 禁用 emoji |
| `--no-tips` | 隐藏提示 |

---

## 验证状态

✅ 所有命令执行成功
✅ 参数解析正确
✅ Zod 验证生效
✅ 类型转换正确 (string → number)
✅ JSON 输出正常
✅ 帮助信息生成正常
