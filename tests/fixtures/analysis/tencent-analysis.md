# tencent.yaml

## 原始结构

```
.wrap zh-cn: [t:100 41.4KB→6KB]
  .wrap_head: [t:42 5.3KB→1.1KB]
    .head_con: [t:6 5.1KB→1.1KB]
      .menu_list: [t:42 4.4KB→1KB]
      .lang_area: [div]
    .icon_menu: [div]
    .bg_hover: [div]
  .ten_root: [t:24 29.3KB→3.6KB]
    .ten_header_pad: [div]
    .whats-new-container: [t:18 13KB→1.5KB]
      .ten_banner: [section l:6 5.9KB→589B]
        .ten_banner_nav: [div]
          .ten_main: [div]
            .ten_banner_arr: [div]
      .ten_cards: [section t:12 7KB→920B]
        .ten_main: [t:10 7KB→920B]
          .ten_card_grid: [t:11 6.9KB→903B]
            .ten_card_col3: [l:8 t:6 4KB→541B]
              .ten_img: [l:1]
              .ten_card_body: [l:1 t:2]
              .second_line_card_container: [l:4 t:4 ×2 2KB→280B]
                .ten_img: [l:1]
                .ten_card_body: [l:1 t:2]
              .ten_img: [l:1]
              .ten_card_body: [l:1 t:2]
            .ten_card_col4: [l:5 t:4 ×3 2.9KB→362B]
              .ten_img: [l:1]
              .ten_card_body: [l:1 t:2]
    .ten_main: [l:3 t:3]
      .ten_links: [l:3]
    .ten_bg--dark: [t:29 7.7KB→1.2KB]
      .ten_main: [t:6 7.6KB→1.2KB]
        .ten_home--mobile: [l:3 t:6 ×3 1.3KB→191B]
          .ten_img ten_img ten_img--5x2: [l:1 ×2]
        .ten_home: [t:23 6.3KB→1KB]
          .ten_home_l: [l:3 t:6]
          .ten_home_r: [5.7KB→893B]
            #home1: [card active l:4 t:8 ×4 2KB→322B]
              .ten_img ten_img ten_img--5x4: [l:1 ×2]
            #home2: [card l:3 t:7 1.6KB→260B]
              .ten_img ten_img ten_img--5x4: [l:1 ×2]
              .ten_img ten_img ten_img--5x2: [l:1 ×2]
            #home3: [card l:4 t:8 ×4 2.1KB→311B]
              .ten_img ten_img ten_img--5x4: [l:1 ×2]
  .wrap_footer: [t:6 4.2KB→816B]
    .footer_con: [t:19 4.1KB→816B]
      .focus_us: [l:5]
        .focus_list: [l:5]
      .join_us: [l:3 t:1]
        .tit_area: [div]
        .join_list: [l:3 t:3]
      .contact_us: [l:5 t:1]
        .tit_area: [div]
        .contact_list: [l:5 t:5]
      .legal_info: [l:2 t:1]
        .tit_area: [div]
        .legal_list: [l:2 t:2]
      .logo_tencent: [div]
      .footer_area: [l:9 t:3 1.3KB→341B]
        .links: [list l:6 t:6]
  .cookie-pop: [l:3 t:6 2.1KB→564B]
    .pop active: [active l:1 t:5]
      .title: [t:1]
      .btn close-btn: [div]
      .btn-box: [div]
        .btn accept-btn: [t:1]
        .btn refuse-btn: [t:1]
    .pop: [l:1 t:5 ×2]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `.wrap` - 主容器
- `.wrap_head` → `.menu_list` - 顶部导航菜单
- `.ten_root` → `.whats-new-container` - 核心内容区
- `.ten_banner` - 主横幅区域
- `.ten_cards` → `.ten_card_grid` - 卡片网格
- `.ten_bg--dark` - 深色背景区块
- `.ten_home` / `#home1` `#home2` `#home3` - 卡片内容
- `.wrap_footer` - 页脚

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.cookie-pop` | Cookie 同意弹窗，属于临时交互 |
| `.pop` (非 active) | 未激活的弹窗状态，无实际可见内容 |
| `.bg_hover` | 悬停背景效果，纯装饰性 |
| `.icon_menu` | 移动端图标菜单，主要内容无需保留 |
| `.ten_header_pad` | 空占位容器，无实际内容 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `.ten_main` | 通用类名，跨多个区块重复使用，易冲突 |
| `.ten_img ten_img--5x4` | 尺寸修饰符类，可能随设计调整变化 |
| `#home1` `#home2` `#home3` | 硬编码 ID，顺序改变会导致引用失效 |

### 过滤后的结构树

```
.wrap
├── .wrap_head
│   └── .menu_list
├── .ten_root
│   ├── .whats-new-container
│   │   ├── .ten_banner
│   │   └── .ten_cards
│   │       └── .ten_card_grid
│   │           ├── .ten_card_col3
│   │           └── .ten_card_col4
│   └── .ten_bg--dark
│       └── .ten_home
│           ├── #home1
│           ├── #home2
│           └── #home3
└── .wrap_footer
    ├── .focus_us
    ├── .join_us
    ├── .contact_us
    └── .legal_info
```
