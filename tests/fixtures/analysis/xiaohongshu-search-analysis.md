# xiaohongshu-search.yaml

## 原始结构

```
#app: [i:1 b:12 t:111 82.7KB→4.1KB]
  #global: [i:1 b:4 t:66 79KB→3.9KB]
    .header-container: [i:1 b:4 l:1 t:2 7KB→104B]
      .mask-paper: [header i:1 b:4 l:1 6.9KB→104B]
        #link-guide: [4.7KB→13B]
          .header-logo: [4.6KB→6B]
        .input-box: [i:1]
          #search-input: [input]
          .input-button: [div]
            .close-icon: [div]
            .search-icon: [div]
        .right: [b:3 t:2 1.2KB→55B]
          .menu: [b:3 1.1KB→55B]
            .dropdown-nav: [b:2 t:2 ×2]
            #small-more-info: [nav menu h b:1]
              .menu-icon-btn: [h b:1]
    .main-container: [t:104 71.8KB→3.8KB]
      .side-bar: [t:34 8.5KB→997B]
        .channel-list: [t:16 5.6KB→587B]
          .channel-list-content: [l:6 t:1 2.9KB→182B]
            #explore-guide-refresh: [l:1 t:1]
              .link-wrapper: [a]
            .link-wrapper bottom-channel: [l:1 t:1]
              .link-wrapper bottom-channel: [a]
                .badge-container: [div]
          .app-info: [t:16 2.5KB→398B]
            .corp-info: [div]
        #explore-guide-menu: [form t:11 2.9KB→410B]
          .information-wrapper: [t:1]
          .app-info outside: [t:16 2.5KB→398B]
            .corp-info: [div]
      .with-side-bar main-content: [t:27 60.3KB→2.6KB]
        .feeds-page: [t:76 60.2KB→2.6KB]
          .search-layout: [t:27 60.2KB→2.6KB]
            .search-layout__top: [t:1]
              #channel-container: [t:4]
                .content-container: [div]
                  #all: [active t:1]
                  #image: [t:1]
                  #video: [t:1]
                  #user: [t:1]
            .search-layout__middle: [div]
            .search-layout__main: [t:75 59KB→2.6KB]
              .feeds-container: [t:23 ×25 56.5KB→2.6KB]
                .note-item: [section l:3 t:3 2.3KB→105B]
                  .card-bottom-wrapper: [l:1 t:1 1.2KB→56B]
                    .like-wrapper like-active: [active]
              .feeds-loading: [h 2.3KB→13B]
      .bottom-menu: [h l:6 t:5 3KB→149B]
        .channel-list: [h l:6 t:1 2.9KB→149B]
          .bottom-channel: [h l:1 t:1 ×3]
          .link-wrapper bottom-channel: [h l:1 t:1]
            .link-wrapper bottom-channel: [h]
              .badge-container: [h]
  .ad-wrap: [h]
  .container out right: [b:5 t:2 2KB→69B]
    .header fullscreen-header: [h b:2]
      .left: [h b:1]
      .title: [h t:1]
      .right: [h b:1]
    .header panel-header: [b:3 1.2KB→39B]
      .left: [b:1]
      .title: [t:1]
      .right: [b:2]
.dropdown-container: [l:3 t:3 1.5KB→77B]
  .dropdown-items: [h l:3 1.4KB→77B]
.dropdown-container: [l:5 t:5 2.4KB→124B]
  .dropdown-items: [h l:5 2.3KB→124B]
#redeviation-bs-sidebar: [bookmark-sidebar-ukwli51qz38]
#redeviation-bs-indicator: [div]
#autoglm-main-content: [div]
#__plasmo-loading__: [h 3.2KB→46B]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- **搜索区域**：`#search-input`（搜索输入框）、`.input-button`（搜索按钮）、`.close-icon`（清除按钮）
- **频道切换**：`#channel-container` 及其子元素 `#all`、`#image`、`#video`、`#user`（搜索结果分类标签）
- **搜索结果**：
  - `.feeds-container`（结果列表容器）
  - `.note-item`（单个笔记项，可交互的卡片）
  - `.like-wrapper`（点赞按钮）
- **侧边栏频道列表**：`.channel-list`（导航用的频道列表）
- **顶部导航**：`.header-container`（Logo 和菜单）

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.ad-wrap` | 广告容器，无用户价值 |
| `#redeviation-bs-sidebar` | 书签侧边栏（浏览器扩展 Octotree/LSO） |
| `#autoglm-main-content` | 必应/AI 浏览器扩展元素 |
| `#__plasmo-loading__` | 浏览器扩展加载占位符 |
| `.feeds-loading` | 骨架屏加载占位符 |
| `.dropdown-container` / `.dropdown-items` | 下拉菜单（展开时临时显示） |
| `.bottom-menu` | 移动端底部导航（PC 端冗余） |
| `.header fullscreen-header` | 全屏状态临时头 |
| `.container out right` | 右侧面板（临时状态） |
| `.badge-container` | 徽章容器（辅助信息，可选删除） |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `#app` / `#global` | Framework 根容器，版本更新可能改变 |
| `.mask-paper` | CSS Module 生成的类名，可能变化 |
| `.header-container` | 框架级组件标识符 |
| `i:N` 属性 | 内部组件索引标识，动态变化 |
| `#redeviation-*` | 浏览器扩展注入的 ID |

### 过滤后的结构树

```
.body
├── .header-container
│   ├── .header-logo          # Logo
│   ├── .input-box
│   │   ├── #search-input     # [input] 搜索输入
│   │   └── .input-button     # 搜索/清除按钮
│   └── .menu                 # 导航菜单
├── .main-container
│   ├── .side-bar
│   │   └── .channel-list     # 左侧频道导航
│   └── .with-side-bar main-content
│       └── .feeds-page
│           └── .search-layout
│               ├── .search-layout__top
│               │   └── #channel-container   # 搜索分类 [all|image|video|user]
│               └── .search-layout__main
│                   └── .feeds-container
│                       └── .note-item ×N    # [section] 笔记卡片
```
