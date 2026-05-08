---
title: 页面命令
---

# 页面命令

xpage 提供 35+ 统一页面命令，所有操作通过 `(page, args) => Promise<result>` 接口执行。

## 导航命令

| 命令 | 描述 | 参数 |
|------|------|------|
| `goto` | 导航到 URL | `url`, `waitUntil?`, `timeout?` |
| `goBack` | 后退 | — |
| `goForward` | 前进 | — |
| `reload` | 刷新页面 | — |
| `title` | 获取页面标题 | — |
| `url` | 获取当前 URL | — |

## 交互命令

| 命令 | 描述 | 参数 |
|------|------|------|
| `click` | 点击元素 | `selector`, `timeout?`, `force?` |
| `fill` | 填充输入框 | `selector`, `value`, `timeout?` |
| `type` | 逐字输入 | `selector`, `text`, `delay?` |
| `press` | 按键 | `selector`, `key` |
| `hover` | 悬停 | `selector`, `timeout?` |
| `scroll` | 滚动 | `selector?`, `x?`, `y?` |
| `select` | 选择选项 | `selector`, `value` |
| `check` | 勾选复选框 | `selector` |
| `dblclick` | 双击 | `selector`, `timeout?` |

## 查询命令

| 命令 | 描述 | 参数 |
|------|------|------|
| `query` | CSS 选择器查询 | `selector` |
| `find` | 按文本查找 | `text`, `tag?`, `exact?` |
| `html` | 获取 HTML | `selector?`, `clean?` |
| `text` | 获取文本内容 | `selector?` |
| `textContent` | 获取元素文本 | `selector` |
| `inputValue` | 获取输入值 | `selector` |
| `getAttribute` | 获取属性 | `selector`, `name` |

## 等待命令

| 命令 | 描述 | 参数 |
|------|------|------|
| `waitForSelector` | 等待元素出现 | `selector`, `timeout?`, `state?` |
| `wait` | 等待毫秒数 | `timeout` |

## 截图命令

| 命令 | 描述 | 参数 |
|------|------|------|
| `screenshot` | 截图到文件 | `path?`, `fullPage?`, `type?`, `quality?` |
| `screenshotBase64` | 截图为 Base64 | `fullPage?`, `type?` |

## 结构与无障碍命令

| 命令 | 描述 | 参数 |
|------|------|------|
| `structure` | 页面结构提取 | `selector?`, `maxDepth?` |
| `a11y` | 无障碍树 | `selector?`, `format?` |
| `snapshot` | ARIA 快照 | `selector?` |

## 执行命令

| 命令 | 描述 | 参数 |
|------|------|------|
| `evaluate` | 执行 JS 表达式 | `expression` |
| `evaluateRaw` | 执行异步 JS | `script` |

## 命令链

使用 `executeCommandChain` 链式执行多个命令：

```typescript
import { executeCommandChain } from '@dyyz1993/xpage';

const result = await executeCommandChain(page, `
  goto url=https://example.com &&
  title &&
  text selector=body &&
  screenshot path=example.png
`);
```
