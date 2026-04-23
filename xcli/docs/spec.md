# xcli 命令行工具规格文档

## 概述

xcli 是一个基于浏览器自动化的 CLI 工具，参考 agent-browser 的扁平化命令风格设计。所有命令都通过 `--session` flag 指定会话上下文。

## 命令架构

### 扁平化命令设计

```
xcli <command> [options]
```

- **扁平化**: 所有命令都是一级命令，无嵌套子命令
- **Session 隔离**: 通过 `--session` 或 `-s` flag 指定会话
- **默认值**: session 默认为 `default`

## 命令列表

### 会话管理

| 命令 | 说明 | 示例 |
|------|------|------|
| `open` | 打开 URL 并创建/切换 session | `xcli open https://example.com` |
| `close` | 关闭当前 session 的浏览器 | `xcli close` |
| `kill` | 强制杀死当前 session 的浏览器 | `xcli kill` |

### 页面交互

| 命令 | 说明 | 示例 |
|------|------|------|
| `snapshot` | 获取页面元素快照 | `xcli snapshot -i` |
| `click` | 点击元素 | `xcli click @e1` |
| `fill` | 填写表单 | `xcli fill @e2 "text"` |
| `type` | 输入文本（不清空） | `xcli type @e2 "text"` |
| `select` | 选择下拉选项 | `xcli select @e3 "option"` |
| `check` | 勾选复选框 | `xcli check @e1` |
| `press` | 按键 | `xcli press Enter` |
| `scroll` | 滚动页面 | `xcli scroll down 500` |

### 信息获取

| 命令 | 说明 | 示例 |
|------|------|------|
| `get` | 获取信息 | `xcli get text @e1` / `xcli get url` / `xcli get title` |
| `html` | 获取页面 HTML | `xcli html` |
| `screenshot` | 截图 | `xcli screenshot` / `xcli screenshot --full` |
| `pdf` | 导出 PDF | `xcli pdf output.pdf` |

### 存储操作

| 命令 | 说明 | 示例 |
|------|------|------|
| `cookies` | Cookie 操作 | `xcli cookies get` / `xcli cookies set --name foo --value bar` / `xcli cookies clear` |
| `localStorage` | LocalStorage 操作 | `xcli localStorage get` / `xcli localStorage set --key theme --value dark` / `xcli localStorage clear` |

### 等待/监控

| 命令 | 说明 | 示例 |
|------|------|------|
| `wait` | 等待 | `xcli wait 2000` / `xcli wait --load networkidle` / `xcli wait @e1` |
| `network` | 网络监控 | `xcli network requests` / `xcli network route "**/api/**" --abort` |

### 实时查看

| 命令 | 说明 | 示例 |
|------|------|------|
| `viewer` | 打开实时 viewer | `xcli viewer` |

### Daemon 管理

| 命令 | 说明 | 示例 |
|------|------|------|
| `daemon` | Daemon 操作 | `xcli daemon start` / `xcli daemon stop` / `xcli daemon status` |

## Session 管理

### 全局 Flag

| Flag | 说明 |
|------|------|
| `--session <name>` 或 `-s <name>` | 指定会话名称，默认为 `default` |
| `--state <file>` | 从文件加载会话状态 |
| `--headed` | 以有头模式运行浏览器 |

### Session 子命令

| 子命令 | 说明 | 示例 |
|--------|------|------|
| `session list` | 列出所有会话 | `xcli session list` |
| `session save <file>` | 保存当前会话状态 | `xcli session save auth.json` |

## 使用示例

### 基本操作流程

```bash
# 1. 打开页面
xcli open https://example.com/form

# 2. 获取页面元素
xcli snapshot -i
# 输出: @e1 [input type="email"], @e2 [input type="password"], @e3 [button] "Submit"

# 3. 填写表单
xcli fill @e1 "user@example.com"
xcli fill @e2 "password123"

# 4. 点击提交
xcli click @e3

# 5. 等待加载完成
xcli wait --load networkidle

# 6. 重新获取元素（页面可能已变化）
xcli snapshot -i

# 7. 获取结果
xcli get text @e5
```

### 登录并保存状态

```bash
# 登录并保存状态
xcli open https://app.example.com/login
xcli snapshot -i
xcli fill @e1 "$USERNAME"
xcli fill @e2 "$PASSWORD"
xcli click @e3
xcli wait --url "**/dashboard"
xcli session save auth.json

# 之后复用状态
xcli --state auth.json open https://app.example.com/dashboard
```

### 多会话并行

```bash
# 打开两个不同网站的会话
xcli -s site1 open https://site-a.com
xcli -s site2 open https://site-b.com

# 分别操作
xcli -s site1 snapshot -i
xcli -s site2 snapshot -i
```

### 存储操作

```bash
# 获取 cookies
xcli cookies get
# 输出: [{"name": "token", "value": "abc123", "domain": ".example.com", "path": "/"}]

# 设置 cookie
xcli cookies set --name session --value xyz789 --domain .example.com

# 清除 cookies
xcli cookies clear

# LocalStorage 操作
xcli localStorage get
xcli localStorage set --key theme --value dark
xcli localStorage clear
```

### 网络监控

```bash
# 查看网络请求
xcli network requests
xcli network requests --filter "**/api/**"

# 阻止请求
xcli network route "**/ads/**" --abort

# Mock 响应
xcli network route "**/api/users" --body '{"users": []}'
```

### 截图/PDF

```bash
# 普通截图
xcli screenshot

# 全页面截图
xcli screenshot --full

# 导出 PDF
xcli pdf report.pdf
```

## 技术实现

### 命令解析

使用扁平化解析器：
1. 解析全局 flags (`--session`, `--state`, `--headed`)
2. 第一个非 flag 参数作为 command
3. 剩余参数作为 command options

### RPC 通信

- **xcli → daemon**: Unix Domain Socket
- **daemon → HTTP/WS**: HTTP/WebSocket (viewer 用)
- **daemon ↔ Browser**: IPC + CDP

### Session 隔离

每个 session 对应一个 Browser 进程，共享同一个 Playwright CDP Session。

## 文件结构

```
xcli/
├── bin/
│   └── xcli.ts           # 主入口
├── src/
│   ├── commands/          # 命令实现
│   │   ├── open.ts
│   │   ├── close.ts
│   │   ├── snapshot.ts
│   │   ├── click.ts
│   │   ├── fill.ts
│   │   ├── get.ts
│   │   ├── wait.ts
│   │   ├── cookies.ts
│   │   ├── localStorage.ts
│   │   ├── html.ts
│   │   ├── screenshot.ts
│   │   ├── viewer.ts
│   │   ├── network.ts
│   │   └── daemon.ts
│   ├── core/
│   │   ├── session-daemon.ts    # Daemon 进程
│   │   ├── session-client.ts     # xcli 到 daemon 的客户端
│   │   └── arg-parser.ts         # 参数解析
│   └── viewer.html              # WebViewer
└── dist/
```
