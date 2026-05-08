---
title: 开发工作流
---

# 开发工作流

本地开发 xcli 项目的常用工作流和调试技巧。

## npm link 全局调试

将本地开发中的 xcli 链接到全局，在其他项目中实时测试：

```bash
# 在 xcli-core 目录
cd packages/core
npm run build
npm link

# 在测试项目中使用链接
cd ~/my-test-project
npm link @dyyz1993/xcli-core
```

修改源码后需要重新 build 才能生效：

```bash
# 在 xcli-core 目录
npm run build
# 测试项目自动使用新构建产物
```

取消链接：

```bash
cd ~/my-test-project
npm unlink @dyyz1993/xcli-core
npm install
```

## watch 模式开发

使用 TypeScript watch 模式自动编译：

```bash
# 终端 1: 监听源码变化自动编译
npm run dev -- --watch

# 终端 2: 运行 CLI 测试
node dist/cli.js <command>
```

在 `tsconfig.json` 中确保开启了增量编译：

```json
{
  "compilerOptions": {
    "incremental": true,
    "watch": true
  }
}
```

## 插件热重载

xcli 的 Daemon 模式支持插件热重载，无需重启：

```bash
# 启动 Daemon
node dist/cli.js daemon:start

# 修改插件代码后，Daemon 自动检测文件变化并重载
# 观察日志输出确认重载成功
```

手动触发重载：

```bash
node dist/cli.js daemon:reload
```

### 注意事项

- 仅 `.ts` 插件文件变化会触发重载
- `package.json` 变化需要手动重启 Daemon
- 新增插件文件需要重启 Daemon 才能被发现

## 调试技巧

### 日志调试

开启 verbose 日志查看详细执行过程：

```bash
# 环境变量方式
DEBUG=xcli:* node dist/cli.js <command>

# 或使用 --verbose 标志
node dist/cli.js <command> --verbose
```

日志分级：

| 级别 | 说明 |
|------|------|
| `xcli:core` | 核心框架日志 |
| `xcli:plugin` | 插件加载与执行 |
| `xcli:daemon` | Daemon 进程管理 |
| `xcli:browser` | 浏览器操作 |

### Daemon 状态检查

查看 Daemon 当前状态：

```bash
# 检查 Daemon 是否运行
node dist/cli.js daemon:status

# 查看 Daemon 进程信息
ps aux | grep xcli-daemon

# 查看 Daemon 端口
lsof -i :$(cat ~/.xcli/daemon.port)
```

强制重启 Daemon：

```bash
node dist/cli.js daemon:stop
node dist/cli.js daemon:start
```

### 常见问题

**插件加载失败**

检查插件目录结构是否完整：

```bash
ls -la .xcli/plugins/<plugin-name>/
# 必须包含 index.ts 和 package.json
```

**Daemon 连接超时**

```bash
# 清除残留 socket 文件
rm -f ~/.xcli/daemon.sock
# 重启 Daemon
node dist/cli.js daemon:start
```

**构建产物过期**

```bash
# 清除构建缓存
rm -rf dist/
npm run build
```

## 推荐开发流程

1. 修改源码
2. `npm run build` 编译
3. `npm run lint` 检查代码风格
4. `npm run typecheck` 类型检查
5. `npm test` 运行测试
6. 实际 CLI 测试验证

一次性运行所有检查：

```bash
npm run build && npm run lint && npm run typecheck && npm test
```
