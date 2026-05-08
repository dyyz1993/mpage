---
title: 分层设计
---

# 分层设计

## Core 层

| 模块 | 职责 |
|------|------|
| Core | 初始化、命令路由、启动 |
| PluginLoader | 插件加载、热重载、TS 编译 |
| ScopeRegistry | 层级定义、验证、上下文检查 |

## Service 层

| 模块 | 职责 |
|------|------|
| SessionManager | CRUD 操作、归档、持久化 |
| DaemonManager | 进程管理、Worker 池、HTTP API |
| WSServer | 实时通信、频道、广播 |
| OutputFormatter | Text/JSON/YAML 格式化 |
| HelpGenerator | 命令帮助、插件帮助、示例 |
| ScaffoldEngine | 模板生成、变量插值、文件创建 |

## Foundation 层

| 模块 | 职责 |
|------|------|
| ArgParser | 分词、短选项、位置参数 |
| Validator | Zod 校验、类型检查、错误消息 |
| Storage | RC 配置、插件配置、会话数据 |

## 能力矩阵

| 能力 | xcli-core | xpage | 使用者实现 |
|------|-----------|-------|-----------|
| 插件加载/卸载 | ✅ | - | - |
| 命令路由 | ✅ | - | - |
| 参数校验 (Zod) | ✅ | - | - |
| Daemon 进程 | ✅ | - | - |
| Worker 管理 | ✅ | - | 需实现 WorkerEntryPoint |
| 会话管理 | ✅ | - | - |
| 脚手架模板 | ✅ (5种) | - | 可自定义模板 |
| CDP 连接 | - | ✅ | - |
| 页面操作 | - | ✅ | - |
| 录制/回放 | - | ✅ | - |
| 浏览器命令 | - | - | 通过插件注册 |
