# linkedin.yaml

## 原始结构

```
#breakpoint-watcher: [div]
#global-nav-a11y-menu: [b:2]
  #global-nav-a11y-menu-skip: [button]
.site-header  has-link: [b:1 l:7 t:8 3.4KB→335B]
  .primary-navigation-wrapper: [b:1 l:7 t:2 3.3KB→326B]
    .primary-navigation-river: [b:1 l:7 t:8 3.3KB→326B]
      .site-title: [b:1 l:1 t:2 1.5KB→120B]
      .primary-navigation: [l:6 1.7KB→206B]
        .primary-navigation-list link: [l:6 t:6 ×6 1.6KB→165B]
          .primary-navigation-item none: [l:1]
.page-alert-container: [section]
.container js-root-container: [b:8 t:48 40.2KB→2.3KB]
  #main: [b:7 t:39 27.5KB→1.7KB]
    #content: [section b:7 t:18 27.5KB→1.7KB]
      .tile-frame parbase section: [l:5 t:8 10KB→449B]
        .content-margin: [l:5 t:8 9.8KB→449B]
          .tile-frame-grid layout-0: [list l:5 t:9 9.8KB→449B]
  .page-footer js-page-footer: [t:7 3.8KB→610B]
    .page-footer-foreground: [t:11 3.7KB→596B]
      .page-footer-links: [t:7 3.7KB→596B]
        .page-footer-spacer: [div]
        .footer-legal: [t:11 3.6KB→596B]
          .footer-legal-nowrap: [t:7 3.5KB→596B]
            .footer-legal-items: [list l:6 t:6 ×6 1.5KB→171B]
              .footer-legal-item: [l:1]
            .li-footer__item: [l:1]
              .li-footer__item-link: [t:1]
            .footer-legal-copyright: [span]
              .footer-legal-name: [t:1]
  #artdeco-global-alert: [b:1 4KB→26B]
    .artdeco-global-alert__body: [section b:1 t:1 3.9KB→26B]
      #artdeco-global-alert-content: [div]
      #artdeco-global-alert-dismiss: [button]
.modal-wrapper: [b:1 1.4KB→45B]
  .modal-content: [section b:1 t:1 1.3KB→45B]
    .light-gray modal-loader: [h]
      .artdeco-spinner: [div]
    #modal-title: [div]
    .modal-close: [button]
      .modal-close-icon: [li-icon]
    .modal-frame: [iframe]
#batBeacon979353416628: [h]
  #batBeacon601675684499: [h]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `.site-header` - 站点头部容器（包含 logo 和导航）
- `.primary-navigation` - 主导航菜单
- `#content` - 主内容区域
- `.tile-frame` - 内容卡片/瓦片框架
- `.page-footer` - 页脚

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `#breakpoint-watcher` | 调试/开发元素 |
| `#global-nav-a11y-menu` | 无障碍辅助菜单，无实际内容 |
| `#artdeco-global-alert` | 全局提示弹窗组件 |
| `.modal-wrapper` | 模态弹窗（空的加载状态） |
| `#batBeacon979353416628` | 百度统计跟踪信标 |
| `.page-alert-container` | 页面临时提示横幅 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `artdeco-*` | LinkedIn 内部组件库命名，易随版本更新 |
| `batBeacon*` | 第三方跟踪脚本 id，动态生成 |
| `modal-*` | 交互组件，状态会频繁变化 |
| `.js-root-container` | JS 动态挂载的根容器 |
| `#global-nav-a11y-menu` | 可访问性相关的动态菜单 |

### 过滤后的结构树

```
.site-header
  .primary-navigation-wrapper
    .primary-navigation-river
      .site-title
      .primary-navigation
        ul > li > a (×6)
.container
  #main
    #content
      .tile-frame
        .content-margin
          .tile-frame-grid
            (内容卡片列表)
.page-footer
  .page-footer-foreground
    .page-footer-links
      .footer-legal
        .footer-legal-items
          span/text (版权信息)
```
