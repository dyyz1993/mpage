# fliggy.yaml

## 原始结构

```
#J_ems_trip_bar_fixed: [h]
#J_fliggy_top_header: [nav i:1 b:1 l:6 t:5 7.2KB→248B]
  .flg-site-nav-header: [i:1 b:1 l:6 t:2 7.1KB→248B]
    .nav-logo: [div]
    .nav-search-compact: [i:1 b:1 t:1]
      .search-prefix: [div]
      .search-input: [input]
      .search-btn: [button]
      .fly-nav-search-suggest: [h]
      .fly-nav-search-recommend: [h]
    .nav-head-right: [l:6 t:4 6.5KB→189B]
      #F_site_nav_login: [l:2 t:2]
        .flg-site-login: [l:2 t:1]
          .login-info: [l:2 t:2]
            .login-nick: [l:1]
      .header-divider: [×2]
      .nav-hot-line active-icon: [active]
  .flg-site-bg-header: [div]
#fly-common-menulist-wrap: [l:6 t:4 3.4KB→325B]
  #fly-menu: [list l:6 t:5 3.3KB→325B]
    #nav-menu-holiday: [item l:4 t:4 2.2KB→173B]
      .item-popover: [h l:3 1.5KB→141B]
        .fly-popover-content: [h l:3 t:3 1.4KB→141B]
          .trip-menu-ul: [list h l:3 1.3KB→141B]
#J_HomeContainer: [i:16 b:1 t:40 33.9KB→4KB]
  .fly-home-content: [i:16 b:1 t:175 33.9KB→4KB]
    .home-tab-wrap: [i:16 b:1 l:2 t:21 19.7KB→1.9KB]
      .home-business: [i:16 b:1 l:1 t:90 18.9KB→1.9KB]
        .home-business-train: [h]
          .common-tracker-click: [h]
      .home-beautiful: [l:1 t:4]
    .masonry-container: [t:19 14.2KB→2.1KB]
      .masonry-container-title: [t:1]
      .my-masonry-grid: [t:80 ×5 14KB→2KB]
        .my-masonry-grid_column: [l:4 t:4 2.8KB→434B]
      .masonry-load-more: [div]
        .masonry-load-btn: [t:1]
#root: [l:3 1.8KB→666B]
  .fliggy-home-content: [l:3 t:15 1.8KB→666B]
    .home-bottom-summary: [l:3 1.7KB→666B]
      .home-bottom-summary-title: [t:1]
#J_fliggy_footer: [t:33 7.5KB→1.2KB]
  .flg-footer: [t:4 7.4KB→1.2KB]
    .flg-footer-top: [t:28 ×6 4.7KB→867B]
      .footer-top-wrap: [l:2]
        .wrap-head: [t:1]
        .wrap-list: [l:2 t:2]
    .flg-footer-bottom: [l:8 t:5 2.6KB→388B]
      .footer-copyright: [l:1 ×4]
      .footer-record: [l:6 1.8KB→161B]
      .beian-warp: [l:1 t:1]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

| 选择器 | 说明 |
|--------|------|
| `#J_fliggy_top_header` | 主导航栏（搜索、登录） |
| `.nav-search-compact` | 搜索功能区 |
| `#fly-common-menulist-wrap` | 菜单列表 |
| `#J_HomeContainer` | 首页主容器 |
| `.home-tab-wrap` | 内容标签切换区 |
| `.my-masonry-grid` | 瀑布流内容区 |
| `.masonry-load-btn` | 加载更多按钮 |
| `#J_fliggy_footer` | 底部区域 |

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `#J_ems_trip_bar_fixed` | 空隐藏容器，无实际内容 |
| `.fly-nav-search-suggest` | 搜索建议弹窗（隐藏状态） |
| `.fly-nav-search-recommend` | 搜索推荐（隐藏状态） |
| `.home-business-train` | 隐藏的业务追踪元素 |
| `.common-tracker-click` | 点击追踪占位符（隐藏） |
| `.item-popover` | 菜单项弹窗（隐藏状态） |
| `.flg-site-bg-header` | 背景装饰元素，无交互 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `F_` 前缀元素（如 `#F_site_nav_login`） | 阿里系框架内部 ID，可能变化 |
| `.flg-` 类名前缀 | 飞猪特定命名，不通用 |
| `.fly-` 类名前缀 | 内部框架组件标识 |
| `.home-business` → `.home-beautiful` | 首页内容切换区，布局可能变化 |
| `#fly-` 开头的组件 | Web Components 或 Portal 根 |

### 过滤后的结构树

```
#J_fliggy_top_header
  .flg-site-nav-header
    .nav-logo [logo区域]
    .nav-search-compact
      .search-input [搜索输入框]
      .search-btn [搜索按钮]
    .nav-head-right
      #F_site_nav_login [登录入口]
        .login-nick [用户昵称]

#fly-common-menulist-wrap
  #fly-menu [主菜单列表]
    #nav-menu-holiday [度假菜单项]

#J_HomeContainer
  .fly-home-content
    .home-tab-wrap [内容标签]
      .home-business [商务标签页]
      .home-beautiful [发现标签页]
    .masonry-container [瀑布流容器]
      .my-masonry-grid [网格布局]
        .my-masonry-grid_column [列容器×4]
      .masonry-load-btn [加载更多]

#root
  .fliggy-home-content
    .home-bottom-summary [底部说明]

#J_fliggy_footer
  .flg-footer
    .flg-footer-top [底部链接区]
    .flg-footer-bottom [版权信息]
```
