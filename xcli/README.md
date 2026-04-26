# xcli

LLM 友好的插件化 CLI 框架 — 定义规范，不耦合实现。

## 这是什么

xcli 是一个 CLI 规范框架，定义了：

- 插件如何注册命令（`createSite` + `site.command`）
- 命令的入参（Zod schema）和出参（`ok()` / `fail()`）
- 插件的生命周期（load / mount / unmount / reload）
- 插件的安装来源（local / npm / git）
- 运行时架构（Daemon + Worker 进程隔离）

## 快速开始

### 安装

```bash
npm install xcli zod
```

### 创建插件

```bash
mkdir my-project && cd my-project
npx xcli create my-plugin --template static --project
```

### 编辑插件

```bash
vim .xcli/plugins/my-plugin/index.ts
```

最小可运行插件：

```typescript
import { z } from 'zod';
import type { XCLIAPI } from 'xcli';
import { ok } from 'xcli';

export default function (xcli: XCLIAPI) {
  const site = xcli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
  });

  site.command('hello', {
    description: '打个招呼',
    scope: 'project',
    parameters: z.object({ name: z.string().describe('你的名字') }),
    handler: async (params) => {
      return ok({ message: `你好, ${params.name}!` });
    },
  });
}
```

### 运行

```bash
# CLI 模式（单次执行）
npx xcli my-plugin hello --name world

# Daemon 模式（持久化 session，推荐 page/element scope 命令）
npx xcli daemon start
npx xcli open https://example.com
npx xcli my-plugin scrape
npx xcli daemon stop
```

### 查看输出

默认 YAML 格式，加 `--json` 输出 JSON：

```bash
npx xcli my-plugin hello --name world --json
```

## 插件开发

完整文档请参考：

- **[PLUGINS.md](PLUGINS.md)** — 插件 API 参考、4 种模板、最佳实践
- **[SKILL.md](.claude/skills/xcli-plugin-development/SKILL.md)** — 核心 API、CommandContext、生命周期

### 插件目录结构

```
.xcli/plugins/<plugin-id>/
├── index.ts          # 插件入口（必须）
├── package.json      # { "name": "<plugin-id>" }（必须）
└── README.md         # 说明文档（推荐）
```

### 插件加载路径

1. `./.xcli/plugins/` — 当前目录（优先）
2. `../.xcli/plugins/` — 父目录
3. `~/.xcli/plugins/` — 全局用户目录

同名插件：本地优先于全局，后加载覆盖先加载。`.ts` 文件由 jiti 运行时编译，无需预编译。

## 命令一览

### 管理命令

| 命令 | 说明 |
|------|------|
| `xcli create <name> --template <type>` | 创建插件（static / dynamic / login / api） |
| `xcli install <source>` | 从路径安装插件 |
| `xcli remove <name>` | 删除插件 |
| `xcli plugins list` | 列出已加载插件 |
| `xcli plugins info <name>` | 查看插件详情 |
| `xcli plugins reload <name>` | 热重载插件 |
| `xcli plugins unload <name>` | 卸载插件 |
| `xcli plugins doctor` | 诊断插件问题 |
| `xcli daemon start` | 启动后台 Daemon |
| `xcli daemon stop` | 停止 Daemon |
| `xcli daemon status` | 查看 Daemon 状态 |
| `xcli kill` | 终止所有 Daemon 进程 |
| `xcli list` / `xcli ls` | 列出站点和命令 |

### 内建命令

#### project scope

无需浏览器，直接执行。

| 命令 | 说明 |
|------|------|
| `xcli create` | 创建插件 |
| `xcli install` / `remove` | 安装/删除插件 |
| `xcli plugins` | 插件管理 |
| `xcli daemon` | Daemon 管理 |
| `xcli kill` | 终止 Daemon |
| `xcli list` / `ls` | 列出站点 |

#### browser scope

管理浏览器实例。

| 命令 | 说明 |
|------|------|
| `xcli open <url>` | 打开浏览器并导航 |
| `xcli close` | 关闭浏览器 |

#### page scope

需要活跃页面。

| 命令 | 说明 |
|------|------|
| `xcli goto <url>` | 导航到 URL |
| `xcli screenshot` | 页面截图 |
| `xcli html` | 获取页面 HTML |
| `xcli snapshot` | 页面结构快照 |
| `xcli structure` | 页面结构分析 |
| `xcli http` | 发起 HTTP 请求 |
| `xcli record` | 录制操作 |
| `xcli replay` | 回放录制 |

#### element scope

需要页面 + 选择器。

| 命令 | 说明 |
|------|------|
| `xcli click <selector>` | 点击元素 |
| `xcli fill <selector> <value>` | 填充输入框 |
| `xcli type <selector> <text>` | 输入文本 |
| `xcli get <selector>` | 获取元素信息 |
| `xcli press <key>` | 按键 |
| `xcli select <selector> <value>` | 选择下拉选项 |
| `xcli check <selector>` | 勾选复选框 |
| `xcli wait <selector>` | 等待元素出现 |
| `xcli mouse <action>` | 鼠标操作 |
| `xcli scroll <direction>` | 滚动页面 |

## 架构

```
用户/LLM ──→ HTTP/WS ──→ Daemon（薄路由层）──→ IPC ──→ Worker 进程（执行）──→ mpage
                                    │                            │
                                    │ ←──── 响应 ←────────────── │
```

- 每个 session = 独立 worker 进程（`child_process.fork`）
- Daemon 不直接操作浏览器，通过 IPC 路由到 worker
- Worker 崩溃不影响 daemon 和其他 worker
- 不同 session 的命令并行执行，同一 session 串行保证顺序

## Scope 层级

| Scope | 需要的资源 | CLI 模式 | Daemon 模式 | 示例命令 |
|-------|-----------|---------|------------|---------|
| `project` | 无 | 直接执行 | 直接执行 | config, create, install |
| `browser` | 浏览器实例 | 需手动 open | daemon 管理 | open, close |
| `page` | 活跃页面 | 需手动 open | 推荐 | goto, screenshot, html |
| `element` | 页面 + 选择器 | 需手动 open | 推荐 | click, fill, get, press |

默认 scope 为 `page`。框架在执行前自动检查 scope 可用性，不可用时返回错误信息。

## 输出格式

| 格式 | 标志 | 说明 |
|------|------|------|
| YAML | 默认 | 可读性强，适合终端查看 |
| JSON | `--json` | 结构化，适合程序消费 |
| Text | `--text` | 纯文本输出 |

## 开发

```bash
npm run typecheck    # 类型检查
npm run lint         # ESLint
npm run test         # Vitest
npm run validate     # typecheck + lint + test
```

## 详细文档

- [PLUGINS.md](PLUGINS.md) — 完整插件开发指南
- [SKILL.md](.claude/skills/xcli-plugin-development/SKILL.md) — 核心 API 参考
- [references/api-reference.md](references/api-reference.md) — API 完整参考
- [references/templates.md](references/templates.md) — 4 种模板详解
- [references/best-practices.md](references/best-practices.md) — 最佳实践

## License

MIT
