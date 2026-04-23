# mdn.yaml

## 原始结构

```
.a11y-menu: [list l:2 t:2]
.page-layout__banner: [div]
.page-layout__header: [b:9 t:28 30.8KB→3.9KB]
  .navigation__logo: [l:1 1.7KB→26B]
  .navigation__search: [div]
  .navigation__button: [button]
  #navigation__popup: [b:8 t:28 28.1KB→3.8KB]
    .navigation__menu: [b:8 t:84 27.8KB→3.8KB]
      .menu: [nav b:8 t:28 ×9 27.8KB→3.8KB]
        .menu__tab: [b:1 t:12 3.7KB→517B]
          .menu__tab-button: [button]
            .menu__tab-label: [t:1]
          #uid_0j5udkzfapb8: [menu t:12 3.4KB→494B]
            .menu__panel-content: [t:3 ×3 3.1KB→463B]
    .navigation__search: [div]
  #search: [h]
  .breadcrumbs-bar: [l:1 t:1]
.page-layout__main: [t:128 20.5KB→4KB]
  #content: [l:3 t:110 7.2KB→1.6KB]
    .homepage-header: [l:3 t:107 7.1KB→1.6KB]
      .homepage-header__copy: [l:3 t:6]
        .homepage-hero: [section l:3 t:3]
      .homepage-header__search: [div]
      .homepage-header__mandala: [t:104 6.5KB→1.4KB]
  .homepage-body: [t:20 ×3 11.3KB→2.3KB]
    .featured-articles: [list l:6 t:3 2KB→382B]
  .homepage homepage--dark: [l:2 t:3 1.8KB→198B]
    .homepage-footer: [l:2 t:1 1.8KB→198B]
.page-layout__footer: [t:7 10.1KB→1.2KB]
  .footer__mdn: [t:4 7.4KB→880B]
    .footer__intro: [l:1 1.6KB→65B]
      .footer__logo: [1.5KB→18B]
    .footer__socials: [list l:5 1KB→179B]
    .footer__links: [list l:6 t:6 ×3 1.6KB→207B]
  .footer__mozilla: [l:8 t:3 2.5KB→347B]
    .footer__logo: [1.3KB→22B]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构
- `.page-layout__header` - 导航栏容器
  - `.navigation__logo` - Logo 链接
  - `.navigation__search` - 搜索表单
  - `#navigation__popup > .navigation__menu > .menu` - 主菜单
  - `.menu__tab-button` - 菜单标签切换按钮
- `.homepage-header__copy` - 首页头部文案区
  - `.homepage-hero` - 英雄区域
- `.featured-articles` - 精选文章列表
- `.page-layout__footer` - 页脚区域

### 建议删除的内容
| 选择器 | 删除原因 |
|--------|----------|
| `.a11y-menu` | 无障碍辅助菜单，通常可删除 |
| `.page-layout__banner` | 横幅区域，内容较少 |
| `#search` | 隐藏的搜索标题，无实际交互 |
| `.homepage-header__mandala` | 大型装饰图案（6.5KB），对功能无贡献 |
| `.breadcrumbs-bar` | 面包屑导航（仅有1个链接） |

### 不稳定的模式
| 模式 | 原因 |
|------|------|
| `#uid_*` | 框架生成的哈希 ID，会在版本更新时变化 |
| `×N` 数组模式 | 元素数量会随内容动态变化，不应依赖固定索引 |
| `.homepage-body` | 使用 `×3` 重复出现，结构会随文章数量变化 |

### 过滤后的结构树
```
.page-layout__header
├── .navigation__logo (l)
├── .navigation__search
├── .navigation__button
└── #navigation__popup
    └── .navigation__menu > .menu
        └── .menu__tab (×8)
            ├── .menu__tab-button
            └── #uid_xxx (menu)

.page-layout__main
└── #content
    └── .homepage-header
        ├── .homepage-header__copy
        │   └── .homepage-hero
        └── .homepage-header__search

.homepage-body (×3)
└── .featured-articles

.page-layout__footer
├── .footer__mdn
│   ├── .footer__intro
│   ├── .footer__socials (×5)
│   └── .footer__links (×3)
└── .footer__mozilla
```
