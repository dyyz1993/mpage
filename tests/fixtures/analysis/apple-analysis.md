# apple.yaml

## 原始结构

```
#globalheader: [i:1 b:15 t:241 120.6KB→8.9KB]
  #globalmessage-segment: [sidebar]
    .globalmessage-segment-content: [list]
  #globalnav: [i:1 b:15 t:4 120KB→8.9KB]
    .globalnav-content: [i:1 b:15 t:241 119.6KB→8.9KB]
      .globalnav-menuback-button: [button]
        .globalnav-chevron-icon: [span]
      #globalnav-list: [i:1 b:13 t:4 117.2KB→8.8KB]
        .globalnav-link-text: [t:1]
        .globalnav-item globalnav-menu: [b:11 t:235 101.5KB→8.3KB]
          .globalnav-flyout: [b:11 101.4KB→8.3KB]
            .globalnav-menu-list: [b:11 t:235 ×11 101.2KB→8.3KB]
              .globalnav-link-text-container: [1.6KB→15B]
                .globalnav-link-text: [t:1]
              .globalnav-link-chevron: [span]
              #globalnav-submenu-link-store: [t:21 5.2KB→690B]
                .globalnav-submenu-header: [t:1]
                .globalnav-submenu-list: [l:8 t:8 ×8 1.8KB→263B]
                  .globalnav-submenu-link: [t:1]
                .globalnav-submenu-group: [l:5 1.3KB→197B]
                  .globalnav-submenu-header: [t:1]
                  .globalnav-submenu-list: [l:5 t:5 ×5 1.1KB→173B]
                    .globalnav-submenu-list-item: [l:1]
                      .globalnav-submenu-link: [t:1]
                .globalnav-submenu-group: [l:5 1.4KB→213B]
                  .globalnav-submenu-header: [t:1]
                  .globalnav-submenu-list: [l:5 t:5 ×5 1.1KB→181B]
                    .globalnav-submenu-list-item: [l:1]
                      .globalnav-submenu-link: [t:1]
        .globalnav-image-regular: [span]
        .globalnav-image-compact: [span]
        #globalnav-submenu-search: [i:1 b:2 l:5 t:2 10KB→360B]
          .globalnav-searchfield: [i:1 b:2 2.7KB→122B]
            .globalnav-searchfield-wrapper: [i:1 b:2 2.4KB→88B]
              .globalnav-searchfield-input: [input]
              #globalnav-searchfield-src: [h]
              .globalnav-searchfield-reset: [1.2KB→24B]
                .globalnav-image-regular: [span]
                .globalnav-image-compact: [span]
              .globalnav-searchfield-submit: [button]
                .globalnav-image-regular: [span]
                .globalnav-image-compact: [span]
            .globalnav-searchresults-count: [t:1]
          .globalnav-searchresults: [l:5 t:5 7KB→238B]
            .globalnav-searchresults-list: [l:5 ×5 6.6KB→214B]
        #globalnav-bag: [item l:1 2.4KB→57B]
          .globalnav-bag-wrapper: [l:1 t:2 1.8KB→46B]
            #globalnav-menubutton-link-bag: [1.5KB→24B]
              .globalnav-image-regular: [span]
              .globalnav-image-compact: [span]
            .globalnav-bag-badge: [span]
              .globalnav-bag-badge-separator: [span]
              .globalnav-bag-badge-number: [t:1]
              .globalnav-bag-badge-unit: [t:1]
          #globalnav-submenu-bag: [div]
      .globalnav-menutrigger: [b:1 1.8KB→16B]
        #globalnav-menutrigger-button: [1.8KB→16B]
  #globalnav-curtain: [div]
  #globalnav-placeholder: [div]
.main: [b:1 t:79 ×3 112.6KB→5KB]
  .module-content: [l:3 t:2 1.3KB→205B]
    .unit-wrapper: [l:3 t:2 1.3KB→205B]
      .unit-copy-wrapper: [l:2 t:2]
        .cta-links: [l:2]
      .unit-image-wrapper: [div]
#ac-globalfooter: [b:11 t:53 65.6KB→6.3KB]
  .ac-gf-content: [b:11 t:108 65.4KB→6.3KB]
    #ac-gf-label: [t:1]
    .ac-gf-sosumi: [section l:1 t:30 34KB→3KB]
    .ac-gf-directory-column: [b:2 t:17 ×2 5.8KB→566B]
    .ac-gf-footer: [section l:9 t:11 1.9KB→435B]
      .ac-gf-footer-shop: [l:3 t:4]
      .ac-gf-footer-locale: [l:1]
        .ac-gf-footer-locale-link: [t:1]
      .ac-gf-footer-legal: [l:5 1.2KB→228B]
        .ac-gf-footer-legal-copyright: [t:1]
        .ac-gf-footer-legal-links: [list l:5 t:5 ×5]
          .ac-gf-footer-legal-links-item: [l:1]
            .ac-gf-footer-legal-link: [t:1]
#viewport-emitter: [div]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- **#globalheader** - 全局导航容器
- **#globalnav** - 主导航栏
- **#globalnav-list** - 导航菜单列表
- **#globalnav-submenu-search** - 搜索组件（包含搜索输入框和搜索结果）
- **#globalnav-bag** - 购物袋/购物车组件
- **.main** - 主内容区域
- **.ac-gf-content** - 页脚内容
- **.ac-gf-footer-legal-links** - 法律链接列表

---

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.globalnav-image-regular`, `.globalnav-image-compact` | 图标容器，仅含空 span，无实际内容 |
| `.globalnav-searchfield-reset` | 临时交互元素，仅在有输入时显示 |
| `#globalnav-curtain` | 菜单展开时的背景遮罩层，临时状态元素 |
| `#globalnav-placeholder` | 占位元素，辅助定位用 |
| `.globalnav-link-text` (多个) | 纯文本标签，无交互功能 |

---

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| 无明显哈希/框架特定模式 | 该页面结构相对稳定，未检测到 css-module 哈希或 Portal 根元素 |

---

### 过滤后的结构树

```
#globalheader
  #globalnav
    #globalnav-list
      .globalnav-item (菜单项)
        .globalnav-flyout
          .globalnav-menu-list
            .globalnav-submenu-link (链接)
              子菜单列表/分组
    #globalnav-submenu-search
      .globalnav-searchfield-input (搜索输入)
      .globalnav-searchresults (搜索结果)
    #globalnav-bag
      购物袋徽章
.main
  .module-content (主内容)
.ac-globalfooter
  .ac-gf-content
    .ac-gf-footer-legal-links (法律链接)
```
