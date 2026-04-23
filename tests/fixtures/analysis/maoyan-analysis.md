# maoyan.yaml

## 原始结构

```
.header-inner: [i:1 b:1 l:7 t:1096 117KB→13.8KB]
  .city-container: [t:24 115.2KB→13.6KB]
    .city-selected: [active]
      .city-name: [t:1]
    .city-list: [t:1093 114.9KB→13.6KB]
      .city-list-header: [t:1]
  .nav: [l:4 t:4 ×4]
  .user-info: [l:1 t:1]
    .user-avatar J-login: [l:1]
      .user-menu no-login-menu: [list l:1 t:1]
  .search-form: [h i:1 b:1]
  .app-download: [l:1 t:1]
.header-placeholder: [div]
#app: [t:160 41.5KB→4.6KB]
  .aside: [t:104 23KB→3KB]
    .ranking-box-wrapper: [l:5 t:6 2.9KB→391B]
      .panel: [l:5 t:14 2.9KB→391B]
        .panel-header: [div]
        .panel-content: [l:5 t:6 2.7KB→374B]
          .ranking-wrapper ranking-box: [list l:5 t:13 2.6KB→374B]
    .box-total-wrapper clearfix: [l:1 t:3]
    .most-expect-wrapper: [t:16 5.7KB→859B]
      .panel: [t:26 5.7KB→859B]
        .panel-header: [l:1]
        .panel-content: [l:10 t:16 5.3KB→819B]
    .top100-wrapper: [t:11 5.3KB→735B]
      .panel: [t:30 5.2KB→735B]
        .panel-header: [l:1]
        .panel-content: [l:10 t:11 4.8KB→692B]
    .popular-container: [h t:1 ×2 4KB→382B]
  .main: [t:56 18.4KB→1.6KB]
    .movie-grid: [t:24 ×2 18.4KB→1.6KB]
      .panel: [t:22 8.9KB→663B]
        .panel-header: [l:1]
        .panel-content: [t:8 8.5KB→622B]
          .movie-list: [t:20 8.4KB→622B]
#footer: [t:18 2.7KB→649B]
.guide guide-animation-up: [div]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `.header-inner` - 页面头部容器（搜索、城市选择、用户信息）
- `.search-form` - 搜索表单（核心交互）
- `.city-selected` / `.city-list` - 城市选择器（核心交互）
- `.user-avatar` - 用户头像/登录入口
- `#app .main` - 主内容区域
- `.movie-grid .movie-list` - 电影列表（核心数据）
- `.aside` - 侧边栏（排行榜、热门等补充信息）

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.app-download` | APP下载推广提示，临时交互 |
| `.guide` | 引导动画，完成后无需保留 |
| `.header-placeholder` | 无实际内容的占位元素 |
| `.popular-container` | hidden 容器，无可见内容 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `.ranking-wrapper ranking-box` | 排行榜列表项结构，排名数据会频繁变化 |
| `×N` 数组标记 | 列表长度随数据变化，不宜硬编码数量 |

### 过滤后的结构树

```
.header-inner
├── .city-container
│   ├── .city-selected  [城市选择按钮]
│   └── .city-list      [城市列表下拉]
├── .nav                [导航链接]
├── .user-info
│   └── .user-avatar    [登录/用户菜单]
└── .search-form        [搜索框]

#app
├── .aside
│   ├── .ranking-box-wrapper    [票房/热度排行榜]
│   ├── .box-total-wrapper      [今日票房统计]
│   ├── .most-expect-wrapper    [最受期待]
│   └── .top100-wrapper         [Top100榜单]
│
└── .main
    └── .movie-grid
        └── .movie-list         [电影卡片列表]

#footer
```
