# bilibili.yaml

## 原始结构

```
.browser-tip: [div]
#app: [i:1 b:4 t:128 272.7KB→5.8KB]
  .bili-feed4: [i:1 b:4 t:98 272.5KB→5.8KB]
    .bili-header large-header: [i:1 t:47 51.2KB→1.5KB]
      .bili-header__bar: [i:1 t:13 18KB→671B]
        .left-entry: [list l:8 3.9KB→253B]
        .center-search__bar: [i:1 2.1KB→54B]
          #nav-searchform: [i:1 2KB→54B]
            .nav-search-content: [i:1 1.1KB→47B]
              .nav-search-input: [input]
              .nav-search-clean: [div]
            .nav-search-btn: [div]
          .search-panel: [h]
        .right-entry: [list t:7 11.9KB→364B]
          .header-entry-mini: [a]
          .header-entry-avatar: [a]
            .bili-avatar: [div]
          .vip-wrap: [l:1 2.4KB→31B]
      .bili-header__banner: [l:1 10.5KB→219B]
        #bili-header-banner-img: [picture]
        .animated-banner: [×33 9.5KB→192B]
          .layer: [div]
        .header-banner__inner: [l:1]
        .taper-line: [div]
      .bili-header__channel: [t:7 22.7KB→654B]
        .channel-icons: [l:2 t:2 4.6KB→44B]
        .right-channel-container: [t:38 18.1KB→610B]
          .channel-items__left: [t:1 7.3KB→492B]
            #channel-entry-more: [2.3KB→12B]
          .channel-items__right: [l:6 t:6 10.7KB→118B]
    .header-channel: [h t:26 13.5KB→902B]
      .header-channel-fixed: [h t:20 13.4KB→902B]
        .header-channel-fixed-center: [h]
        .header-channel-fixed-right: [h t:24 6.4KB→864B]
          .left-bottom: [h t:14 2KB→279B]
        .header-channel-fixed-arrow: [h 2.2KB]
    .bili-feed4-layout: [main b:3 t:52 198.7KB→3.3KB]
      .fixed-channel-shim: [div]
      .feed2: [b:3 t:56 198.6KB→3.3KB]
        .container is-version8: [b:2 t:55 195.3KB→3.3KB]
          .recommended-swipe: [b:2 16.6KB→513B]
            .recommended-swipe-core: [b:2 t:1 16.5KB→513B]
              .recommended-swipe-shim: [1KB]
                .bili-video-card: [×2]
                .shim-card: [×2]
              .recommended-swipe-body: [b:2 15.4KB→513B]
                .recommended-swipe-body-normal: [b:2 t:1 15.3KB→513B]
                  .carousel-container: [b:2 t:1 15.2KB→513B]
                    .vui_carousel__slides: [11.9KB→355B]
                      .vui_carousel__slide: [l:1 ×8 1KB→26B]
                    .carousel-footer: [l:1 t:1 1.8KB→140B]
                      .carousel-footer-mask: [div]
                      .carousel-footer-text: [l:1]
                        .carousel-footer-title: [l:1 t:1]
                      .carousel-dots: [1.4KB→106B]
                        .carousel-dots-list: [1.3KB→106B]
                    .carousel-arrows: [b:2 1.2KB→18B]
          .feed-card: [l:3 t:5 ×10 15.4KB→313B]
          .floor-single-card: [l:5 t:3 7.9KB→160B]
            .floor-card single-card: [l:5 t:2 7.8KB→160B]
              .floor-card-inner: [l:5 t:3 7.7KB→160B]
                .cover-container: [l:1 t:1 6KB→55B]
              .layer: [div]
              .layer tiny: [div]
          .bili-video-card: [×4]
          .load-more-anchor: [div]
            .floor-single-card: [div]
              .floor-card-inner: [div]
                .cover-container: [div]
                  .cover skeleton-item: [div]
                .skeleton-item sub-information: [×2]
              .layer: [div]
              .layer tiny: [div]
          .bili-video-card: [×4]
          .floor-single-card: [div]
            .floor-card-inner: [div]
              .cover-container: [div]
                .cover skeleton-item: [div]
              .skeleton-item sub-information: [×2]
            .layer: [div]
            .layer tiny: [div]
          .bili-video-card: [×4]
          .floor-single-card: [div]
            .floor-card-inner: [div]
              .cover-container: [div]
                .cover skeleton-item: [div]
              .skeleton-item sub-information: [×2]
            .layer: [div]
            .layer tiny: [div]
        .feed-roll-btn: [b:1 t:1 3.2KB→22B]
    .palette-button-inner: [b:1 l:2 t:2 8.9KB→85B]
      .palette-button-wrap: [b:1 l:2 t:3 8.8KB→85B]
        .watchlater-pip-button: [3.5KB→17B]
          .watchlater-pip-button-inner: [2.1KB→17B]
            .btn-icon: [1.9KB→6B]
            .btn-tips: [h t:1]
          .entry-toast: [h 1.3KB]
            .close: [h 1.2KB]
            .text: [h]
        .flexible-roll-btn hidden: [1.3KB→14B]
          .flexible-roll-btn-inner: [t:1 1.3KB→14B]
            .btn-text: [div]
        .storage-box hidden: [l:2 t:1 3.3KB→33B]
          .storable-items: [h l:2 t:1 2.3KB→33B]
            .primary-btn feedback: [h t:1]
          .primary-btn three-dots: [div]
        .top-btn-wrap: [b:1 t:1]
    #biliMainFooter: [h]
#TG4rlbWAV7: [h]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

1. **头部导航**
   - `.left-entry` - 主导航入口
   - `#nav-searchform` - 搜索框
   - `.right-entry` - 用户/消息入口

2. **频道导航**
   - `.bili-header__channel` - 主导航频道
   - `.header-channel-fixed` - 固定频道栏

3. **视频推荐流**
   - `.feed2` - 推荐流主容器
   - `.recommended-swipe` - 轮播推荐
   - `.feed-card` - 卡片推荐
   - `.floor-single-card` - 楼层卡片
   - `.bili-video-card` - 视频卡片

4. **悬浮操作**
   - `.palette-button-wrap` - 右下角悬浮按钮

---

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.bili-header__banner` | 横幅广告区域，无实质内容 |
| `.animated-banner` | 动画横幅，纯装饰 |
| `.header-banner__inner` | 横幅内层，空容器 |
| `.taper-line` | 装饰线条 |
| `.recommended-swipe-shim` | 轮播占位骨架 |
| `.layer` | 覆盖层装饰（×多个） |
| `.layer tiny` | 小型覆盖装饰（×多个） |
| `.load-more-anchor .floor-single-card` | 加载中的骨架屏 |
| `.cover skeleton-item` | 骨架屏占位 |
| `.skeleton-item sub-information` | 骨架屏文本 |
| `.watchlater-pip-button` | 小窗按钮，隐藏状态 |
| `.flexible-roll-btn` | 灵活按钮，隐藏状态 |
| `.storage-box` | 存储箱，隐藏状态 |
| `.entry-toast` | 入口提示，隐藏 |
| `.carousel-footer-mask` | 轮播遮罩装饰 |
| `#biliMainFooter` | 底部，隐藏 |
| `#TG4rlbWAV7` | 未知元素，隐藏 |

---

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `.bili-avatar` | 组件类名，可能随版本变化 |
| `.header-entry-avatar` | 特定前缀，Framework生成 |
| `.bili-video-card` | B站组件命名 |
| `.floor-card single-card` | BEM混合命名 |

---

### 过滤后的结构树

```
#app
├── .bili-header large-header
│   ├── .bili-header__bar
│   │   ├── .left-entry
│   │   ├── .center-search__bar / #nav-searchform
│   │   └── .right-entry
│   ├── .bili-header__channel
│   │   ├── .channel-icons
│   │   └── .right-channel-container
│   └── .header-channel
│       └── .header-channel-fixed
├── .bili-feed4-layout (main)
│   └── .feed2
│       ├── .container is-version8
│       │   ├── .recommended-swipe
│       │   │   └── .carousel-container
│       │   │       ├── .vui_carousel__slides
│       │   │       └── .carousel-footer
│       │   ├── .feed-card (×10)
│       │   ├── .floor-single-card (×4)
│       │   └── .bili-video-card (×10)
│       └── .feed-roll-btn
└── .palette-button-inner
    └── .palette-button-wrap
        └── .top-btn-wrap
```

**核心交互区**：搜索框 `.nav-search-input`、视频卡片 `.bili-video-card`、频道导航 `.channel-items__right`
