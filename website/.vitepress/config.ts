import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'xcli',
  description: '插件化 CLI 框架 & 浏览器自动化引擎',
  base: '/mpage/',
  lang: 'zh-CN',

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'xcli',

    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: '教程', link: '/tutorial/create-your-cli' },
      {
        text: 'API 参考',
        items: [
          { text: '@dyyz1993/xpage', link: '/api/xpage/overview' },
          { text: '@dyyz1993/xcli-core', link: '/api/xcli-core/overview' },
        ],
      },
      { text: '插件开发', link: '/plugins/overview' },
      { text: '架构', link: '/architecture/overview' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装', link: '/guide/installation' },
            { text: '核心概念', link: '/guide/core-concepts' },
          ],
        },
        {
          text: 'mpage 浏览器引擎',
          items: [
            { text: '快速开始', link: '/guide/xpage-quickstart' },
            { text: '页面命令', link: '/guide/page-commands' },
            { text: '录制与回放', link: '/guide/recording-playback' },
            { text: '页面结构提取', link: '/guide/structure-extraction' },
          ],
        },
        {
          text: 'xcli-core CLI 框架',
          items: [
            { text: '快速开始', link: '/guide/xcli-quickstart' },
            { text: '脚手架创建', link: '/guide/scaffolding' },
            { text: '配置管理', link: '/guide/configuration' },
            { text: 'CI 配置', link: '/guide/ci-setup' },
            { text: '开发工作流', link: '/guide/development-workflow' },
          ],
        },
      ],

      '/tutorial/': [
        { text: '创建你的 CLI', link: '/tutorial/create-your-cli' },
        { text: '编写第一个命令', link: '/tutorial/first-command' },
        { text: '编写插件', link: '/tutorial/write-plugin' },
        { text: '自定义领域 CLI', link: '/tutorial/custom-domain-cli' },
        { text: '踩坑指南', link: '/tutorial/common-pitfalls' },
        { text: '部署指南', link: '/tutorial/deploy-guide' },
      ],

      '/api/xpage/': [
        { text: '概览', link: '/api/xpage/overview' },
        { text: '命令执行', link: '/api/xpage/execute' },
        { text: '录制器', link: '/api/xpage/recorder' },
        { text: '回放引擎', link: '/api/xpage/player' },
        { text: '全部命令', link: '/api/xpage/commands' },
      ],

      '/api/xcli-core/': [
        { text: '概览', link: '/api/xcli-core/overview' },
        { text: 'Core 类', link: '/api/xcli-core/core' },
        { text: 'PluginLoader', link: '/api/xcli-core/plugin-loader' },
        { text: 'SessionManager', link: '/api/xcli-core/session-manager' },
        { text: 'Daemon', link: '/api/xcli-core/daemon' },
        { text: 'WebSocket', link: '/api/xcli-core/websocket' },
        { text: 'ScaffoldEngine', link: '/api/xcli-core/scaffold' },
      ],

      '/plugins/': [
        { text: '概览', link: '/plugins/overview' },
        { text: '插件结构', link: '/plugins/structure' },
        { text: 'XCLIAPI 接口', link: '/plugins/xcli-api' },
        { text: '命令 handler', link: '/plugins/command-handler' },
        { text: '安装器', link: '/plugins/installers' },
        { text: '最佳实践', link: '/plugins/best-practices' },
        { text: '测试', link: '/plugins/testing' },
        { text: '安装详解', link: '/plugins/install-step-by-step' },
        { text: '发布插件', link: '/plugins/publishing' },
      ],

      '/architecture/': [
        { text: '整体架构', link: '/architecture/overview' },
        { text: '分层设计', link: '/architecture/layers' },
        { text: '数据流', link: '/architecture/data-flow' },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/dyyz1993/mpage' }],

    search: {
      provider: 'local',
    },

    footer: {
      message: '基于 MIT 许可发布',
    },
  },
});
