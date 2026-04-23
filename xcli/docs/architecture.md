# xcli 架构文档

## 概述

xcli 是一个基于 Playwright 的浏览器自动化 CLI 工具，采用客户端-守护进程架构。

## 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              xcli (命令行入口)                              │
│                         bin/xcli.ts (参数解析)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Unix Socket (~/.xcli/sessions/daemon.sock)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          daemon (常驻进程)                                  │
│                      src/core/session-daemon.ts                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     Playwright Browser                                │  │
│  │   context-1                    context-2                   ...      │  │
│  │   ┌─────────┐                ┌─────────┐                           │  │
│  │   │  page   │                │  page   │                           │  │
│  │   └─────────┘                └─────────┘                           │  │
│  │      │                            │                                 │  │
│  │   session-1                    session-2                            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    HTTP Server (:8054)                                │  │
│  │   GET /docs          → Swagger UI                                     │  │
│  │   GET /swagger.json  → OpenAPI 规范                                   │  │
│  │   GET /viewer.html   → 实时画面查看器                                 │  │
│  │   GET /api/sessions  → Session 列表                                   │  │
│  │   POST /rpc           → HTTP RPC (备用)                              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                  WebSocket Server (/ws)                               │  │
│  │   实时画面流 (Page.screencast)                                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                  Unix Socket Server                                  │  │
│  │   接收 xcli RPC 命令                                                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
xcli/
├── bin/
│   └── xcli.ts                      # CLI 入口，参数解析
├── src/
│   ├── core/
│   │   ├── session-daemon.ts       # 守护进程（Playwright + HTTP + WS）
│   │   ├── session-client.ts        # xcli → daemon 通信客户端
│   │   ├── daemon-manager.ts        # daemon 进程管理
│   │   ├── plugin-loader.ts         # 插件加载器
│   │   └── arg-parser.ts            # 参数解析（备用）
│   ├── commands/
│   │   ├── daemon.ts                # daemon 命令
│   │   ├── create.ts                # create 命令
│   │   ├── install.ts               # install 命令
│   │   ├── remove.ts                # remove 命令
│   │   ├── plugins.ts               # plugins 命令
│   │   └── execute-site.ts          # 插件命令执行
│   ├── protocol/
│   │   └── plugin-protocol.ts       # 插件协议类型定义
│   └── viewer.html                  # WebViewer HTML
├── docs/
│   ├── spec.md                      # 规格文档
│   └── architecture.md              # 本文档
└── dist/                            # 编译输出
```

## 通信机制

### 1. xcli → daemon (Unix Socket)

- 路径: `~/.xcli/sessions/daemon.sock`
- 高效本地通信
- JSON 格式请求/响应

### 2. daemon → HTTP/WS (Viewer)

- 端口: `8054`
- HTTP: API 接口、Swagger UI
- WebSocket: 实时画面流

## RPC 命令体系

### session.* (会话管理)

| 命令 | 说明 | 参数 |
|------|------|------|
| `session.open` | 打开新 session | `name`, `url` |
| `session.close` | 关闭 session | `name` |
| `session.kill` | 强制杀死 | `name` |
| `session.closeAll` | 关闭所有 | - |
| `session.list` | 列出所有 | - |

### storage.* (存储操作)

| 命令 | 说明 | 参数 |
|------|------|------|
| `storage.get` | 获取存储 | `name`, `type` (cookies/localStorage) |
| `storage.set` | 设置存储 | `name`, `type`, `key`, `value`, `data` |
| `storage.clear` | 清除存储 | `name`, `type` |

### page.* (页面操作)

| 命令 | 说明 | 参数 |
|------|------|------|
| `page.html` | 获取 HTML | `name` |
| `page.screenshot` | 截图 | `name` |

## xcli 命令行

```
xcli <command> [options]

全局选项:
  --session <name>, -s <name>    Session 名称 (默认: default)
  --json                         JSON 输出 (默认: YAML)
  --help                         显示帮助
```

### 会话管理

| 命令 | 说明 | 示例 |
|------|------|------|
| `open <url>` | 打开 URL | `xcli open https://example.com` |
| `close` | 关闭浏览器 | `xcli close` |
| `kill` | 强制杀死 | `xcli kill` |
| `list` | 列出 sessions | `xcli list` |

### 页面交互

| 命令 | 说明 | 示例 |
|------|------|------|
| `snapshot [-i]` | 获取页面快照 | `xcli snapshot -i` |
| `click <@eref>` | 点击元素 | `xcli click @e1` |
| `fill <@eref> <text>` | 填写表单 | `xcli fill @e1 "text"` |
| `type <@eref> <text>` | 输入文本 | `xcli type @e1 "text"` |
| `select <@eref> <value>` | 选择下拉 | `xcli select @e2 "option"` |
| `press <key>` | 按键 | `xcli press Enter` |
| `scroll <up\|down> <px>` | 滚动 | `xcli scroll down 500` |

### 信息获取

| 命令 | 说明 | 示例 |
|------|------|------|
| `get <url\|title\|text>` | 获取信息 | `xcli get url` |
| `html` | 获取 HTML | `xcli html` |
| `screenshot [--full]` | 截图 | `xcli screenshot --full` |

### 存储操作

| 命令 | 说明 | 示例 |
|------|------|------|
| `cookies <get\|set\|clear>` | Cookie 操作 | `xcli cookies get` |
| `localStorage <get\|set\|clear>` | LocalStorage 操作 | `xcli localStorage set --key theme --value dark` |

### 等待/监控

| 命令 | 说明 | 示例 |
|------|------|------|
| `wait <ms\|@eref\|--load>` | 等待 | `xcli wait --load` |
| `network <requests\|route\|unroute>` | 网络监控 | `xcli network requests` |

### 其他

| 命令 | 说明 | 示例 |
|------|------|------|
| `viewer` | 实时 viewer | `xcli viewer` |
| `daemon <start\|stop\|status>` | Daemon 管理 | `xcli daemon status` |
| `create --name <id>` | 创建插件 | `xcli create --name 01-static` |
| `plugins <list\|info>` | 查看插件 | `xcli plugins list` |
| `install <source>` / `i` | 安装插件 | `xcli i npm:xcli-plugin` |
| `remove <name>` / `uninstall` | 卸载插件 | `xcli remove baidu` |

### 安装命令格式

```
xcli i [flags] <source>

Flags:
  -g, --global    全局安装 (默认)
  -p, --project  本地安装到 .xcli/plugins/
  -f, --force    覆盖已存在的插件
```

### 安装源格式

| 格式 | 说明 | 示例 |
|------|------|------|
| `git:<url>` | Git 仓库 | `xcli i git:https://github.com/user/repo` |
| `npm:<package>` | NPM 包 | `xcli i npm:xcli-scraper` |
| `github:<user/repo>` | GitHub 仓库 | `xcli i github:user/repo` |
| `<name>` | 官方模板 | `xcli i static` |

官方模板: `static`, `dynamic`, `login`, `api`

## 插件系统

### 插件结构

```
.xcli/plugins/<plugin-id>/
├── index.ts          # 插件入口
└── package.json      # 包配置
```

### 插件示例

```typescript
import type { XCLIAPI } from 'xcli';

const BASE_URL = 'https://example.com';

export default function (xcli: XCLIAPI) {
  const plugin = xcli.createSite({
    name: 'my-plugin',
    url: BASE_URL,
  });

  plugin.command('scrape', {
    description: '采集数据',
    parameters: {},
    handler: async (params, ctx) => {
      await ctx.page.goto(plugin.url);
      // ... 采集逻辑
      return { data: [], tips: ['采集完成'] };
    },
  });

  plugin.command('verify', {
    description: '校验数据',
    parameters: {},
    handler: async (params, ctx) => {
      return { data: [], errors: [], tips: [] };
    },
  });
}
```

### 内置插件

| 插件 | 说明 |
|------|------|
| `11-login` | 登录认证示例 |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `XCLI_CHROMIUM_PATH` | Chromium 浏览器路径 | `/Applications/Chromium.app/Contents/MacOS/Chromium` |

## 端口分配

| 端口 | 用途 |
|------|------|
| `8054` | HTTP Server (viewer/swagger/rpc) |
| `~/.xcli/sessions/daemon.sock` | Unix Socket (xcli RPC) |

## 设计原则

1. **Session 隔离**: 每个 session 对应一个 BrowserContext
2. **统一通信**: xcli 通过 Unix Socket，Viewer 通过 HTTP/WS
3. **扁平命令**: 命令设计遵循 agent-browser 风格
4. **插件扩展**: 插件放在 `~/.xcli/plugins/` (全局) 或 `./.xcli/plugins/` (本地)
5. **YAML 输出**: 默认 YAML 格式，`--json` 切换为 JSON
