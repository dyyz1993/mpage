---
description: xcli 插件开发约束
paths: .xcli/plugins/**
---

# 插件开发约束

- 入口必须是 export default function (xcli: XCLIAPI): void 签名
- 插件通过 createSite() 注册独立命名空间，插件之间不得直接 import
- handler 接收 CommandContext，不得直接访问全局状态或 Daemon 内部
- 命令名用 kebab-case（如 scrape、reveal-phone）
- 目录名用 {序号}-{名称} 或纯名称（如 baidu）
- 插件的依赖必须在插件自己的 package.json 中声明
- 必须从 `../_shared` 导入 safeGoto/ok/fail，禁止裸 page.goto()
- tips 输出必须包含数量 + 关键值（如"采集到 15 条数据，含 3 个分类"），禁止只写"数据已采集"
- API 页面优先用 page.evaluate 内 fetch API 获取数据，优于 DOM 解析
- 编码陷阱：evaluate 内 atob() 返回 Latin-1，中文必须用 TextDecoder('utf-8') 解码
