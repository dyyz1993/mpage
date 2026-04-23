# xcli 命令目录结构规范

## 目录结构

```
xcli/
├── bin/
│   └── xcli.ts                    # CLI 入口 (参数解析, 命令分发)
├── src/
│   ├── core/                      # 核心模块
│   │   ├── session-daemon.ts     # 守护进程 (Playwright + HTTP + WS)
│   │   ├── session-client.ts     # 客户端 (Unix Socket RPC)
│   │   ├── daemon-manager.ts     # Daemon 进程管理
│   │   ├── plugin-loader.ts      # 插件加载器
│   │   ├── page-hook.ts          # 异常检测 Hook
│   │   └── arg-parser.ts         # 参数解析
│   ├── commands/                  # 内置命令实现
│   │   ├── daemon.ts             # daemon start/stop/status
│   │   ├── create.ts            # create --name <id>
│   │   ├── install.ts            # install -g/-p <source>
│   │   ├── remove.ts            # remove <name>
│   │   ├── plugins.ts           # plugins list/info
│   │   └── execute-site.ts      # 执行 site 插件命令
│   ├── protocol/                 # 协议定义
│   │   └── plugin-protocol.ts   # 插件协议类型
│   └── viewer.html               # WebViewer HTML
├── tests/                        # 测试目录
│   ├── unit/                    # 单元测试
│   ├── integration/              # 集成测试
│   └── e2e/                     # E2E 测试
├── docs/                         # 文档
│   ├── architecture.md          # 架构文档
│   └── testing.md              # 测试规范
└── dist/                        # 编译输出
```

## 命令实现规范

### 1. 命令文件结构

每个命令对应一个独立的 `.ts` 文件，放在 `src/commands/` 目录：

```typescript
// src/commands/<command-name>.ts

import { OptionType } from '../protocol/option-type';

/**
 * 命令描述
 */
export async function <commandName>Command(
  args: string[],
  values: Record<string, any>
): Promise<void> {
  // 1. 参数验证
  // 2. 业务逻辑
  // 3. 输出结果
}

// 导出命令元数据
export const <commandName>Meta = {
  name: '<command-name>',
  description: '命令描述',
  usage: 'xcli <command-name> [options]',
  options: [
    { name: 'option', type: 'string', required: false, default: 'value' }
  ]
};
```

### 2. 命令注册

在 `bin/xcli.ts` 中注册命令：

```typescript
// 动态导入，避免循环依赖
if (cmd === '<command-name>') {
  const { <commandName>Command } = await import('../src/commands/<command-name>');
  await <commandName>Command(cmdArgs, values);
  return;
}
```

### 3. 命令选项定义

使用 `parseArgs` 定义选项：

```typescript
const { values, positionals } = parseArgs({
  options: {
    // 布尔选项
    json: { type: 'boolean', default: false },
    verbose: { type: 'boolean', short: 'v' },

    // 字符串选项
    session: { type: 'string', short: 's', default: 'default' },
    name: { type: 'string' },

    // 全局选项自动处理
    help: { type: 'boolean', default: false },
  },
  allowPositionals: true,
});
```

### 4. 输出格式

#### YAML (默认)
```typescript
console.log(yamlStringify(result));
```

#### JSON (--json)
```typescript
if (values.json) {
  console.log(JSON.stringify(result, null, 2));
}
```

#### 结果结构
```typescript
interface CommandResult {
  data: any[];           // 数据列表
  errors?: Array<{       // 错误列表 (可选)
    field: string;
    expected: string;
    actual: string;
  }>;
  tips?: string[];       // 提示列表 (可选)
}
```

### 5. 错误处理

```typescript
try {
  // 业务逻辑
} catch (error) {
  if (values.json) {
    console.error(JSON.stringify({ error: error.message }));
  } else {
    console.error(`Error: ${error.message}`);
  }
  process.exit(1);
}
```

## 已有命令清单

| 命令 | 文件 | 状态 |
|------|------|------|
| `daemon` | `commands/daemon.ts` | ✅ 已实现 |
| `create` | `commands/create.ts` | ✅ 已实现 |
| `install` / `i` | `commands/install.ts` | ✅ 已实现 |
| `remove` / `uninstall` | `commands/remove.ts` | ✅ 已实现 |
| `plugins` | `commands/plugins.ts` | ✅ 已实现 |
| `open` | - | ❌ 未实现 |
| `html` | - | ❌ 未实现 |
| `snapshot` | - | ❌ 未实现 |
| `screenshot` | - | ❌ 未实现 |
| `viewer` | - | ❌ 未实现 |
| `cookies` | - | ❌ 未实现 |
| `localStorage` | - | ❌ 未实现 |
| `click` | - | ❌ 未实现 |
| `fill` | - | ❌ 未实现 |
| `type` | - | ❌ 未实现 |
| `select` | - | ❌ 未实现 |
| `press` | - | ❌ 未实现 |
| `scroll` | - | ❌ 未实现 |
| `wait` | - | ❌ 未实现 |
| `get` | - | ❌ 未实现 |
| `network` | - | ❌ 未实现 |

## 待实现命令优先级

### P0 (核心)
1. `open` - 打开 URL
2. `html` - 获取页面 HTML
3. `screenshot` - 截图
4. `snapshot` - 页面快照

### P1 (重要)
5. `viewer` - 实时 viewer
6. `cookies` / `localStorage` - 存储操作
7. `click` / `fill` / `type` - 交互

### P2 (一般)
8. `select` / `press` / `scroll` - 其他交互
9. `wait` - 等待
10. `get` - 获取信息
11. `network` - 网络监控
