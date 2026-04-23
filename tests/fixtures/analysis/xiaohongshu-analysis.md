# xiaohongshu.yaml

## 原始结构

```
#app: [i:1 b:12 t:73 106.2KB→3.8KB]
  #global: [i:1 b:4 t:85 101.8KB→3.6KB]
    .header-container: [i:1 b:4 l:1 t:2 7.5KB→104B]
      .mask-paper: [header i:1 b:4 l:1 7.4KB→104B]
        #link-guide: [active 4.7KB→13B]
          .header-logo: [4.6KB→6B]
        .input-box: [i:1]
          #search-input: [input]
          .input-button: [div]
            .search-icon: [div]
        .right: [b:3 t:2 1.6KB→55B]
          .menu: [b:3 1.5KB→55B]
            .dropdown-nav: [b:2 t:2 ×2]
            #small-more-info: [nav menu b:1]
              .menu-icon-btn: [b:1]
    .main-container: [t:66 94.2KB→3.5KB]
      .side-bar: [t:34 10.1KB→997B]
        .channel-list: [t:16 6.7KB→587B]
          .channel-list-content: [l:6 t:1 3.5KB→182B]
            #explore-guide-refresh: [active l:1 t:1]
            .link-wrapper bottom-channel: [l:1 t:1]
              .link-wrapper bottom-channel: [a]
                .badge-container: [div]
          .app-info: [t:16 3KB→398B]
            .corp-info: [div]
        #explore-guide-menu: [form t:11 3.4KB→410B]
          .information-wrapper: [t:1]
          .app-info outside: [t:16 3KB→398B]
            .corp-info: [div]
      .with-side-bar main-content: [t:46 80.5KB→2.4KB]
        #mfContainer: [feed t:38 80.4KB→2.4KB]
          .channel-container: [7.3KB→150B]
            #channel-container: [t:12 7.2KB→150B]
              .content-container: [×11 7KB→150B]
                #homefeed.fashion_v3: [t:1]
          #feeds-replace-loading: [×2 1.3KB]
          #exploreFeeds: [t:46 ×25 68.3KB→2.2KB]
            .note-item: [section l:3 t:1 2.5KB→87B]
              .author-wrapper: [l:1 t:2 1.3KB→41B]
                .like-wrapper like-active: [active]
          .feeds-loading: [3.2KB→13B]
      .bottom-menu: [l:6 t:5 3.5KB→149B]
        .channel-list: [l:6 t:1 3.4KB→149B]
          .bottom-channel: [l:1 t:1 ×3]
          .link-wrapper bottom-channel: [l:1 t:1]
            .link-wrapper bottom-channel: [a]
              .badge-container: [div]
  .ad-wrap: [div]
  .container out right: [b:5 t:2 2.4KB→69B]
    .header fullscreen-header: [b:2]
      .left: [b:1]
      .title: [t:1]
      .right: [b:1]
    .header panel-header: [b:3 1.4KB→39B]
      .left: [b:1]
      .title: [t:1]
      .right: [b:2]
.dropdown-container: [l:3 t:3 1.6KB→77B]
  .dropdown-items: [h l:3 1.5KB→77B]
.dropdown-container: [l:5 t:5 2.5KB→124B]
  .dropdown-items: [h l:5 2.5KB→124B]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

**头部**
- `.header-container` - 主导航容器
  - `#link-guide` - Logo 区域
  - `.input-box` - 搜索框（搜索功能）
  - `.right .menu` - 右侧导航菜单

**侧边栏**
- `.side-bar` - 左侧导航栏
  - `.channel-list` - 频道列表（核心导航）
  - `#explore-guide-menu` - 探索菜单

**主内容区**
- `#mfContainer` - 内容Feed主容器
  - `.channel-container` - 频道内容区
  - `#homefeed.fashion_v3` - 首页/时尚内容
  - `#exploreFeeds` - 动态内容列表
    - `.note-item` - **笔记/内容卡片**（核心交互单元）
    - `.author-wrapper` - 作者信息
    - `.like-wrapper` - 点赞功能

**底部导航**
- `.bottom-menu` - 底部固定导航（移动端）
  - `.channel-list` - 底部频道列表

**悬浮元素**
- `.dropdown-container` - 下拉菜单（×2）

---

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.ad-wrap` | 广告容器，无实际内容 |
| `.feeds-loading` | 加载占位符（3.2KB→13B） |
| `#feeds-replace-loading` | 加载占位符（×2） |
| `.corp-info` | 公司/版权信息，纯文本说明 |
| `.app-info` | 应用信息，非核心交互 |
| `.app-info.outside` | 同上，外部信息 |
| `.badge-container` | 徽章容器（×2），无实际功能 |
| `.container.out.right` | 右侧辅助面板，非核心内容 |

---

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `#mfContainer` | Feed容器ID，可能动态生成 |
| `#exploreFeeds` | 动态内容加载ID |
| `#explore-guide-menu` | 探索菜单ID，可能随路由变化 |
| `#channel-container` | 频道容器ID |
| `.information-wrapper` | 信息包装器，无具体标识 |

---

### 过滤后的结构树

```
#app
├── .header-container
│   ├── #link-guide (.header-logo)
│   ├── .input-box (#search-input)
│   └── .right.menu (.dropdown-nav ×2, #small-more-info)
│
├── .main-container
│   ├── .side-bar
│   │   └── .channel-list (#explore-guide-refresh, bottom-channel ×2)
│   │
│   └── .with-side-bar.main-content
│       └── #mfContainer
│           ├── .channel-container (#homefeed.fashion_v3)
│           └── #exploreFeeds (.note-item ×25)
│               └── .author-wrapper (.like-wrapper)
│
└── .bottom-menu
    └── .channel-list (bottom-channel ×3)
```
