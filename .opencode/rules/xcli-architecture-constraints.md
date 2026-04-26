---
paths:
  - xcli/src/**
  - xcli/.xcli/plugins/**
---

# xcli 架构约束规则

## 必须遵循

- 每个命令必须声明 scope（project/browser/page/element）
- handler 返回值必须用 ok() 或 fail()，不要返回裸对象
- 插件禁止使用 @ts-ignore
- 插件禁止使用 any 类型
- daemon 层禁止直接 import playwright
- 浏览器操作只能在 worker 进程中执行
- 参数定义必须用 Zod schema

## 禁止

- 禁止在 handler 中 throw Error（用 fail()）
- 禁止直接操作全局状态（用 ctx.storage）
- 禁止插件之间直接 import（用事件系统）
