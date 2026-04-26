---
description: xcli CLI 框架代码约束
paths: xcli/src/**, xcli/bin/**, xcli/tests/**
---

# xcli 代码约束

- 可以依赖 mpage（@dyyz1993/xpage），但 mpage 不能反向依赖 xcli
- session-daemon.ts 当前 825 行，修改时优先拆分而非继续堆叠
- RPC handler 必须有明确的参数类型（禁止 params?: any，用 Zod schema 或接口）
- 插件加载必须通过 jiti 处理 .ts 文件，不得用裸 import()
- Daemon 中禁止空 catch 吞错误（catch {}），至少记录日志
