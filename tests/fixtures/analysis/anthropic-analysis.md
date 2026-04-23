# anthropic.yaml

## 原始结构

```
.nav_logo_trigger: [div]
.page_wrap u-bg-ivory-medium: [main i:3 b:16 t:164 183.6KB→9.7KB]
  .page_code_wrap: [t:2 15.4KB]
    .page_code_base w-embed: [7KB]
    .page_code_custom w-embed: [5.4KB]
  .nav_component is-desktop: [b:6 t:55 102.7KB→3.7KB]
    .code-embed w-embed: [7.1KB]
    .nav_skip_text: [t:1]
    .nav_skip_wrap w-inline-block: [a]
      .nav_skip_text: [t:1]
  #main: [header l:4 t:4 3.7KB→324B]
    .u-container: [l:4 t:12 3.4KB→315B]
      .home_hero_grid u-grid-tablet: [l:4 t:4 3.4KB→315B]
        .u-column-7: [l:4 t:11 3KB→255B]
        .u-column-5: [t:1]
          .home_hero_bump: [div]
  .mars-cta_section: [b:1 l:1 t:4 2.8KB→206B]
    .mars-cta_scroll-bg: [t:2 2.1KB→152B]
      .mars-cta_container: [t:4 2KB→152B]
        .mars-cta_title-wrap: [t:1]
          .mars-cta_date: [t:1]
        .mars-cta_planet-wrap: [div]
          .mars-cta_planet-overlay: [div]
        .mars-cta_subtitle-wrap: [t:1 1.5KB→79B]
          .btn_main_wrap is-full-black: [h 1.2KB→24B]
            .btn_main_text: [t:1]
            .u-hide-if-empty u-icon-16: [div]
    .g_clickable_wrap: [b:1 l:1 t:2]
  .g_section_wrap: [b:4 l:4 t:12 10.8KB→995B]
    .u-container u-radius-medium: [b:4 l:4 t:19 10.6KB→995B]
      .u-grid-desktop: [b:4 l:4 t:12 ×3 10.5KB→967B]
        .u-column-4: [b:1 l:1 t:6 2.7KB→290B]
          .package_banner is-pad-m: [b:1 l:1 t:3 ×2 2.7KB→290B]
  .g_section_wrap: [l:5 t:5 5.3KB→544B]
    .g_section_space: [div]
    .u-container: [l:5 t:7 5KB→544B]
      .u-grid-desktop: [l:5 t:5 4.8KB→544B]
        .u-column-4: [t:2]
        .u-column-8: [l:5 t:5 4.6KB→467B]
          .w-list-unstyled: [l:5 t:5 4.6KB→467B]
  #footer: [i:3 b:5 t:27 43KB→4KB]
    .footer_title u-sr-only: [t:1]
    .footer_contain u-container: [i:3 b:5 t:78 42.8KB→4KB]
      .footer_grid: [nav i:3 b:5 t:27 42.8KB→4KB]
        .footer_grid_logo: [l:3 t:2 3.7KB→167B]
          .footer_bottom_text: [t:2]
          .footer_bottom_list: [l:3 ×3 3.2KB→128B]
            .footer_bottom_item: [l:1 1.3KB→44B]
              .u-icon-24: [div]
        .footer_grid_content: [i:3 b:5 t:75 ×4 35.6KB→3.6KB]
          .footer_group_wrap: [section t:2 ×2 7.5KB→772B]
            .footer_group_block: [t:15 6.2KB→647B]
              .footer_group_title: [t:1]
              .footer_group_item: [l:1 t:1]
                .footer_link_text: [t:1]
        .footer_bottom_text: [t:2]
        .footer_bottom_list: [l:3 ×3 3.2KB→128B]
          .footer_bottom_item: [l:1 1KB→18B]
            .u-icon-24: [div]
.u-display-none: [15KB]
  .lottie_wrap: [15KB]
    .u-embed-js w-embed w-script: [h]
    .lottie_component: [14.9KB]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `.nav_component` - 桌面端主导航菜单
- `#main` - 主要内容区域容器
- `.home_hero_grid` - 首页英雄区（包含 .u-column-7 的主要内容和 .u-column-5 的辅助内容）
- `.g_section_wrap` - 内容区块容器（包含网格布局和卡片）
- `#footer` - 页脚区域
- `.footer_grid` - 页脚导航网格

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.page_code_wrap` | 空的代码嵌入容器，无实际内容 |
| `.mars-cta_section` | 推广横幅/CTA 区域 |
| `.mars-cta_scroll-bg` | CTA 背景动画 |
| `.g_clickable_wrap` | 可点击的覆盖层，无实际内容 |
| `.u-display-none .lottie_wrap` | 隐藏的 Lottie 动画组件（14.9KB） |
| `.nav_skip_wrap` | 屏幕阅读器跳转链接，可删除 |
| `.mars-cta_planet-wrap` | 装饰性星球动画 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `.u-*` 工具类 | Webflow 生成的工具类（u-container, u-radius-medium, u-column-*, u-grid-*） |
| `.is-*` 修饰符 | 状态修饰符类（is-desktop, is-full-black, is-pad-m） |
| `.w-*` 嵌入类 | Webflow 框架特定类（w-embed, w-inline-block, w-list-unstyled） |
| `.g_*` 通用类 | Webflow 生成器前缀的类名 |

### 过滤后的结构树

```
.nav_component (导航)
  └── .nav_logo_trigger (logo)

#main
  └── .home_hero_grid (英雄区网格)
      ├── .u-column-7 (主要内容)
      └── .u-column-5 (辅助内容)
          └── .home_hero_bump

.g_section_wrap (内容区块 ×N)
  └── .u-container
      └── .u-grid-desktop
          └── .u-column-4
              └── .package_banner (卡片)

#footer
  └── .footer_contain
      └── .footer_grid
          ├── .footer_grid_logo (logo区)
          ├── .footer_grid_content (链接组 ×4)
          │   └── .footer_group_wrap
          │       └── .footer_group_block
          │           ├── .footer_group_title
          │           └── .footer_group_item ×N
          └── .footer_bottom_list (底部链接)
```
