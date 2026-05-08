---
layout: home
hero:
  name: xcli
  text: 插件化 CLI 框架
  tagline: 5 分钟创建你的领域 CLI 工具。浏览器自动化、数据库管理、API 调试，一个框架全搞定。
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
  - icon: 🔌
    title: TypeScript 插件系统
    details: jiti 运行时加载 .ts 插件，无需预编译。5 种安装方式（本地/npm/git/url/内置），支持热重载和隔离命名空间。插件可覆盖命令并调用原始 handler。

  - icon: 🕷️
    title: 浏览器自动化引擎
    details: 基于 Playwright 的 35+ 页面命令。goto/click/type/screenshot 开箱即用，录制用户操作并回放，提取页面语义结构和无障碍树。

  - icon: ⚡
    title: 一条命令创建项目
    details: npx create-xcli my-cli 即可生成完整项目骨架。5 种内置模板（base/browser/database/api/plugin），TypeScript + tsup + ESLint 开箱即用。

  - icon: 🏗️
    title: 领域无关的架构
    details: Scope 层级（project/browser/page/element）、Daemon 后台进程、Worker 进程池、Session 持久化。不绑定浏览器或数据库，适配任何领域。

  - icon: 🔄
    title: 命令覆盖与增强
    details: 插件可覆盖任意命令，装饰器模式支持前置/后置增强。通过 getOriginalHandler() 调用原始逻辑，卸载时自动恢复。

  - icon: 🧪
    title: 生产级质量保障
    details: xcli-core 99% 测试覆盖率，1600+ 测试用例，42 页完整文档。Vitest 单元测试 + GitHub CI 全自动验证，Node 20/22 双版本测试。
---
