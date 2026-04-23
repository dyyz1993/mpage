# youtube.yaml

## 原始结构

```
#guide-service: [h]
#content: [i:2 b:129 t:98 ×5 636.1KB→17.4KB]
  #masthead-container: [i:1 b:9 l:1 t:2 23.7KB→362B]
    #masthead: [header i:1 b:9 l:1 t:5 ×4 23.6KB→362B]
      #ticker: [div]
#secondary: [b:1 t:1 ×2 11.1KB→53B]
  #secondary-split-scroll-spacer: [h]
#survey: [div]
#engagement-panel-scrim: [h]
#persistent-panel-container: [h]
#video-preview: [i:1 b:28 l:4 t:10 36.1KB→932B]
  .style-scope ytd-app: [i:1 b:28 l:4 t:11 36.1KB→932B]
    #video-preview-container: [i:1 b:26 l:4 t:9 31.6KB→865B]
      #media-container: [video i:1 b:26 l:4 t:11 31.5KB→865B]
        #media-container-link: [video h 2.7KB→7B]
        #thumbnail-container: [video l:1 ×2 3.9KB→27B]
          #media-container-link: [video 3.1KB→7B]
        #player-container-wrapper: [video i:1 b:26 l:2 t:9 24.8KB→831B]
          #player-container: [video i:1 b:26 l:2 t:11 24.7KB→831B]
            #inline-player: [video i:1 b:26 l:2 t:9 24.6KB→831B]
              #container: [player b:20 l:2 t:6 16.6KB→487B]
                #inline-preview-player: [nav card video b:20 l:2 t:3 16.4KB→487B]
                  .html5-video-container: [div]
                    .video-stream html5-main-video: [video]
                  .ytp-gradient-top: [div]
                  .ytp-chrome-top: [l:2]
                    .ytp-title-channel: [div]
                      .ytp-title-beacon: [div]
                      .ytp-title-expanded-overlay: [div]
                        .ytp-title-expanded-heading: [div]
                          .ytp-title-expanded-title: [div]
                          .ytp-title-expanded-subtitle: [div]
                    .ytp-title: [l:2 t:1]
                      .ytp-title-text: [l:2]
                        .ytp-title-subtext: [l:1]
                  .ytp-gated-actions-overlay: [h b:1]
                    .ytp-gated-actions-overlay-bar: [h ×2]
                  .ytp-speedmaster-label: [h t:1]
                  .ytp-speedmaster-icon: [h]
                  .ytp-suggested-action: [h b:2]
                  .video-ads ytp-ad-module: [div]
                  .ytp-cued-thumbnail-overlay: [h b:1]
                  .ytp-overlays-container: [b:13 t:4 7.9KB→256B]
                    .ytp-overlay-top-left: [div]
                    .ytp-overlay-top-right: [b:9 t:2 6.7KB→220B]
                      .ytp-chrome-top-buttons: [b:8 t:4 6KB→204B]
                        .ytp-search-icon: [h]
                        .ytp-search-title: [h t:1]
                        .ytp-button ytp-cards-button: [h t:2 2KB→41B]
                          .ytp-cards-button-icon-default: [h]
                            .ytp-cards-button-icon: [h]
                            .ytp-cards-button-title: [h t:1]
                          .ytp-cards-button-icon: [h 1.2KB]
                          .ytp-cards-button-title: [h t:1]
                        .ytp-cards-teaser: [h b:2 1KB→37B]
                          .ytp-cards-teaser-box: [h]
                          .ytp-cards-teaser-text: [h b:2]
                            .ytp-cards-teaser-info-icon: [h]
                            .ytp-cards-teaser-label: [h]
                            .ytp-cards-teaser-close-button: [h]
                    .ytp-overlay-bottom-left: [b:2]
                      .ytp-suggested-action: [h b:2]
                    .ytp-suggested-action: [h b:2]
                  .ytp-suggested-action: [h b:2 1.5KB→31B]
                .ytp-overlay-bottom-right: [div]
                  .ytp-overlay-inline-container: [div]
              .ytp-spinner: [h]
                .ytp-spinner-container: [h]
                  .ytp-spinner-rotator: [h]
                    .ytp-spinner-left: [h]
                      .ytp-spinner-circle: [h]
                    .ytp-spinner-right: [h]
                      .ytp-spinner-circle: [h]
                .ytp-spinner-message: [h t:1]
              .ytp-bezel-text-wrapper: [h]
                .ytp-bezel-text: [h]
              .ytp-bezel: [h]
                .ytp-bezel-icon: [h]
              .ytp-seek-overlay: [h]
                .ytp-seek-overlay-message: [h]
                  .ytp-seek-overlay-message-icon: [h]
                  .ytp-seek-overlay-message-text: [h]
              #ytp-caption-window-container: [t:1]
                #caption-window-1: [div]
              #ytp-id-20: [modal menu h b:1]
                .ytp-playlist-menu-header: [h b:1]
                  .ytp-playlist-menu-title: [h b:1]
                  .ytp-playlist-menu-subtitle: [h]
                .ytp-playlist-menu-items: [h]
              #ytp-id-23: [modal h i:1 b:1 t:3 1.1KB→101B]
                .ytp-share-panel-inner-content: [h i:1]
                  #ytp-id-22: [h t:1]
                  .ytp-share-panel-error: [h t:1]
              #ytp-id-28: [modal h b:1]
                .ytp-overflow-panel-content: [h]
    #overlays: [video]
    #player-controls: [video b:2 t:1 3.6KB→67B]
    #metadata: [video]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `#masthead-container` - YouTube 顶部导航栏（搜索框、用户菜单）
- `#secondary` - 右侧边栏容器
- `#video-preview-container` - 视频预览区域根容器
- `#player-container-wrapper` - 视频播放器主容器
- `#media-container` - 视频媒体元素容器
- `#player-controls` - 播放控制栏

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `#guide-service` | 空隐藏容器 |
| `#survey` | 调查弹窗 |
| `#engagement-panel-scrim` | 互动面板遮罩层 |
| `#persistent-panel-container` | 持久面板容器 |
| `.ytp-spinner` | 加载旋转器（临时加载状态） |
| `.ytp-bezel` / `.ytp-bezel-text-wrapper` | 视频控制提示（临时交互） |
| `.ytp-seek-overlay` | 拖动进度条时的临时覆盖层 |
| `.ytp-gated-actions-overlay` | 视频广告锁定操作覆盖层 |
| `.ytp-chrome-top` | 播放器顶部工具栏（可精简） |
| `.ytp-suggested-action` | 视频内建议操作按钮 |
| `.ytp-share-panel-inner-content` | 分享面板弹窗 |
| `.ytp-overflow-panel-content` | 溢出菜单面板 |
| `.ytp-cards-teaser` | 视频卡片推荐提示 |
| `.ytp-cards-button` | 卡片按钮（临时交互） |
| `.ytp-playlist-menu-items` | 播放列表菜单弹窗 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `ytp-*` | YouTube Web Components，版本更新会变化 |
| `.style-scope` | YouTube CSS Modules 前缀 |
| `#ytp-id-*` | 动态生成的 ID，带版本哈希 |
| `.html5-video-container` | HTML5 播放器内部结构 |
| `#inline-preview-player` | 内联预览播放器组件 |

### 过滤后的结构树

```
#masthead-container
  #masthead

#secondary

#video-preview
  #video-preview-container
    #media-container
      #thumbnail-container
      #player-container-wrapper
        #player-container
          #inline-player
            #container
              .html5-video-container
            #player-controls
            #metadata
```
