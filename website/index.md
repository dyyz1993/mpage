---
layout: home
hero:
  name: xcli
  text: 插件化 CLI 框架 & 浏览器自动化引擎
  tagline: 一个框架，无限领域。浏览器自动化、数据库管理、API 调试，5 分钟创建你的 CLI 工具。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 创建你的 CLI
      link: /tutorial/create-your-cli
    - theme: alt
      text: GitHub
      link: https://github.com/dyyz1993/mpage

features:
  - title: 🔌 插件系统
    details: jiti 运行时加载 TypeScript 插件，5 种安装方式（local/npm/git/url/builtin），热重载，隔离命名空间。
  - title: 🏗️ 通用 CLI 框架
    details: 领域无关的核心设计。Scope 层级管理、Daemon 后台进程、Worker 进程池、Session 持久化。
  - title: 🕷️ 浏览器自动化
    details: 基于 Playwright 的浏览器引擎。35+ 页面命令、录制/回放、页面结构提取、无障碍树。
  - title: ⚡ 脚手架生成
    details: 一条命令生成项目骨架。5 种内置模板（base/browser/database/api/plugin），TypeScript 开箱即用。
  - title: 🔧 命令覆盖
    details: 插件可覆盖原有命令并调用原始 handler。装饰器模式，前置/后置增强，卸载时自动恢复。
  - title: 🧪 测试覆盖 99%
    details: xcli-core 99% 测试覆盖率，1600+ 测试用例。Vitest 单元测试 + GitHub CI 自动验证。
---
