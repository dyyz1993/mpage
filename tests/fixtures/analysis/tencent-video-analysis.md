# tencent-video.yaml

## 原始结构

```
#channel-app: [i:1 b:9 t:192 589.9KB→9.4KB]
  .web-page large-focus: [i:1 b:9 t:217 589.9KB→9.4KB]
    .top-nav-wrap: [i:1 b:7 t:54 92.2KB→2.2KB]
      #channel-top-nav: [i:1 b:7 t:62 92.1KB→2.2KB]
        .top-nav-wrap head_inner: [i:1 b:7 t:54 91.9KB→2.2KB]
          .search-wrap: [i:1 b:1 l:1 t:2 3.9KB→86B]
            .mod_search: [i:1 b:1 l:1 t:1 3.9KB→86B]
              #searchForm: [i:1 b:1 l:1 t:2 3.4KB→86B]
                .search_keywords: [i:1]
                  #keywords: [search input]
                .search-btn-wrap: [2.1KB→38B]
                  .simple-style: [t:1]
                  .whole-style: [t:1 1KB→13B]
                    .icon-text-wrap: [div]
                      .btn_inner: [t:1]
              #searchBoxSdk: [h]
                #root: [h]
          #ssi-user-bar: [b:6 t:60 87.9KB→2.1KB]
            .mod_quick: [b:6 t:53 87.7KB→2.1KB]
              .quick_item quick_games: [l:1 t:1 1.4KB→24B]
              #quick_access: [item t:2 12.7KB→140B]
                #quick_access_link: [1.1KB→28B]
                .mod_quick_pop mod_pop_access: [t:5 11.6KB→112B]
                  .pwa-sc---kVsO: [t:1 11.5KB→112B]
                    .pwa-sc__arrow--dYvoF: [div]
                    .pwa-sc__row--jblbp: [t:3 ×2 6.2KB→65B]
              #modHistory: [item b:3 l:2 t:1 2.2KB→71B]
                #history_pop: [b:3 l:1 t:3 1.5KB→52B]
                  .triangle_line: [div]
                  #quickPopTabs: [b:3]
                    #btnQuickHistory: [tab active t:1]
                    #btnQuickBinge: [tab t:1]
                    #btnQuickSubs: [tab t:1]
                  #modQuickHistory: [video]
                  #modQuickBinge: [video]
                  #modQuickSubs: [video]
                  #quickHistoryFooterLink: [h]
              #modCreate: [item l:2 t:2 2.8KB→135B]
                .mod_quick_pop mod_pop_create: [l:1 t:6 1.3KB→109B]
                  .triangle_line: [div]
                  .create_pop_content: [l:1 t:1 1.1KB→109B]
                    .create_pop_top: [div]
                    .create_pop_mid: [t:6 ×3]
                      .create_pop_mid_item: [div]
                    .create_pop_bot: [l:1]
              #modApp: [item h t:12 7.3KB→187B]
                .quick_link: [h 1.1KB→12B]
                #app_pop: [h 6.2KB→175B]
                  .triangle_line: [h]
                  .app_pop_content: [h t:11 ×11 6.1KB→175B]
                    .app_item: [h]
                      .app_icon: [h]
                      .app_name: [h t:1]
              .quick_item quick_vip: [l:2 t:4 2KB→84B]
              #pc_client: [item t:1 3.4KB→123B]
                .mod_quick_pop mod_pop_client: [t:4]
                  .triangle_line: [div]
                  .content_panel: [div]
                    .tv_logo: [div]
                    .client_type: [t:1]
                    .client_desc: [t:1]
                    .download_btn: [t:1]
                    .see_more: [t:1]
              #modMore: [item b:3 l:7 t:20 33KB→756B]
                .quick_link: [div]
                #more_pop: [b:3 l:7 t:23 32.1KB→744B]
                  .triangle_line: [div]
                  .more_pop_content: [b:3 l:7 t:19 31.9KB→744B]
                    .quick_item quick_games none: [l:1 t:1 1.4KB→24B]
                    #quick_access: [item t:2 12.8KB→140B]
                      #quick_access_link: [1.1KB→28B]
                      .mod_quick_pop mod_pop_access: [t:5 11.6KB→112B]
                        .pwa-sc---kVsO: [t:1 11.5KB→112B]
                          .pwa-sc__arrow--dYvoF: [div]
                          .pwa-sc__row--jblbp: [t:3 ×2 6.2KB→65B]
                    #modHistory: [item b:3 l:2 t:1 2.2KB→71B]
                      #history_pop: [b:3 l:1 t:3 1.5KB→52B]
                        .triangle_line: [div]
                        #quickPopTabs: [b:3]
                          #btnQuickHistory: [tab active t:1]
                          #btnQuickBinge: [tab t:1]
                          #btnQuickSubs: [tab t:1]
                        #modQuickHistory: [video]
                        #modQuickBinge: [video]
                        #modQuickSubs: [video]
                        #quickHistoryFooterLink: [h]
                    #modCreate: [item l:2 t:2 2.8KB→135B]
                      .mod_quick_pop mod_pop_create: [l:1 t:6 1.3KB→109B]
                        .triangle_line: [div]
                        .create_pop_content: [l:1 t:1 1.1KB→109B]
                          .create_pop_top: [div]
                          .create_pop_mid: [t:6 ×3]
                            .create_pop_mid_item: [div]
                          .create_pop_bot: [l:1]
                    #modApp: [item h t:12 7.3KB→187B]
                      .quick_link: [h 1.1KB→12B]
                      #app_pop: [h 6.2KB→175B]
                        .triangle_line: [h]
                        .app_pop_content: [h t:11 ×11 6.1KB→175B]
                          .app_item: [h]
                            .app_icon: [h]
                            .app_name: [h t:1]
                    .quick_item quick_vip none: [l:2 t:4 2KB→84B]
                    #pc_client: [item t:1 3.4KB→103B]
                      .mod_quick_pop mod_pop_client: [t:3]
                        .triangle_line: [div]
                        .content_panel: [div]
                          .tv_logo: [div]
                          .client_type: [div]
                          .client_desc: [t:1]
                          .download_btn: [t:1]
                          .see_more: [t:1]
              #mod_head_user: [item l:9 t:17 22.6KB→667B]
                #mod_head_notice_trigger: [1.8KB→17B]
                #mod_head_login: [t:1]
                #mod_head_notice_pop: [user h l:9 t:1 4.9KB→185B]
                  .quick_pop_user: [h l:9 t:6 4.8KB→185B]
                    .quick_pop_user_head: [h l:4 2.2KB→54B]
                      .user_info: [h l:2 1.6KB→20B]
                      #quick_user_vip: [h l:2 t:2]
                        .vip_next: [h l:2]
                    .quick_pop_user_body: [h l:4 2.4KB→117B]
                      .quick_feature cf: [h l:4 t:4 2.3KB→117B]
                    .quick_pop_user_footer: [h t:1]
                #mod_notlogin_pop: [h t:3 2.6KB→138B]
                  .pop_login_hd: [h]
                  .pop_login_bd: [h t:4 ×4 1.5KB→94B]
                    .intro_item: [h]
                  .pop_login_footer: [h]
                    .btn_pop_link: [h t:1]
                  #issue_feedback: [login h]
                    .feedback_text: [h t:1]
                .nav-login-panel-sdk: [h t:5 13KB→315B]
                  #new-nav-login-panel: [h t:7 12.8KB→315B]
                    .index-container: [h t:5 12.8KB→315B]
                      .triangle-container: [h]
                        .triangle-div: [h]
                      .login: [h t:1 3.4KB→111B]
                        .nav-loading: [h]
                          .nav-loading-top: [h]
                            .nav-loading-top-left: [h]
                            .nav-loading-top-right: [h]
                          .nav-loading-bottom: [h]
                        .common-card: [h t:3 3KB→111B]
                          .common-card-item: [h ×3]
                          .split-line: [h]
                          .logout-out: [h]
                      .no-login: [h t:6 9KB→204B]
                        .no-login-header: [h]
                        .no-login-content: [h t:5 ×5 7.3KB→154B]
                          .no-login-content-item: [h 1.4KB→31B]
                        .no-login-btn: [h]
                        .no-login-feedback: [h t:1 1.4KB→20B]
                          .feedback-item: [h 1.2KB→20B]
                            .img feedback-icon: [h 1.1KB→6B]
    .left-nav-wrap: [t:52 26.8KB→1.7KB]
      .logo-wrap: [l:1]
      .nav-wrap: [t:8 ×2 26.4KB→1.6KB]
        .nav-item router-click-active: [active t:1]
          .nav-item-wrap: [div]
            .text: [t:1]
            .icon select: [div]
            .icon: [h]
    .content-wrap: [b:2 t:86 470.9KB→5.5KB]
      #channel-main-container: [b:2 t:147 470.8KB→5.5KB]
        .flex-container: [b:2 t:86 470.8KB→5.5KB]
          .video-flow: [t:24 23.8KB→339B]
            .video-flow__head: [23.7KB→339B]
              .video-flow__tablist: [t:24 ×25 23.7KB→339B]
                .video-flow__tabname: [1.1KB→14B]
          #channel-page-scroller: [b:2 t:123 446.6KB→5.1KB]
            .channel-page__module: [b:2 t:2 62KB→622B]
              #web-focus: [video b:2 t:19 62KB→622B]
                .video-focus__content: [b:2 t:2 59.4KB→622B]
                  .focus-img: [h]
                  .video-focus__player: [b:2 t:2 ×2 2.3KB→148B]
                    #vod-focus-play-wrap: [player b:1 1.5KB→74B]
                      .drm-recording-notice: [h t:1]
                      .txp_videos_container: [div]
                      .thumbplayer-user-mod: [div]
                      .txp_alert_info txp_none: [b:1]
                        .txp_alert_content: [b:1]
                          .txp_alert_text: [div]
                  .video-focus__ani-title: [t:1 5.8KB→146B]
                    .video-logo-wrap: [div]
                    .video-label-text: [div]
                    .video-rec-reason: [div]
                    .button-wrap: [t:1 5.2KB→46B]
                      .play-btn: [div]
                      .mute-btn-box: [4.6KB→26B]
                        .mute-btn: [4.6KB→26B]
                          .mute-btn-wrap: [4.5KB→26B]
                  .video-focus__sponsor: [div]
                  .video-focus__banner: [t:16 50.4KB→328B]
                    #focus-row-banner: [50.4KB→328B]
                      .pagination-container-wrap: [t:16 50.3KB→328B]
                        .nav-btn-box: [div]
                        .scroll-wrap: [49.2KB→322B]
                          .scroll-content-wrap: [t:16 ×16 49KB→322B]
                            .focus-list__item: [2.4KB→22B]
                              .item__main: [div]
                                .process-wrap: [div]
                                .unchoice-mask: [div]
                        .nav-btn-box: [1KB→6B]
                          .nav-btn-wrap next no-hover: [1KB→6B]
                            .nav-btn: [div]
                              .nav-btn-ico: [img]
                  .video-focus__bottom-mask: [div]
                  .video-focus__left-mask: [h]
                  .video-focus__right-mask: [h]
            .channel-page__tips: [div]
            .scroll-rec: [div]
          .toast-wrap: [h]
            .toast: [h]
#login_win: [div]
  .web-login-mask: [h]
#sync-cookie-iframe: [h]
#svg-icon__btn-vip: [h]
#toast-container: [h]
#shortcut: [l:4 t:7 3.1KB→100B]
  #recovery_mini_player: [item]
    .shortcut-item-pop hide: [t:1]
  .shortcut-item undefined: [×2]
  .shortcut-item undefined hide: [div]
    .shortcut-item-pop hide: [t:1]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

1. **搜索区域**
   - `#searchForm` - 搜索表单（含 `#keywords` 输入框）

2. **用户区域**
   - `#mod_head_user` - 用户登录/信息区
   - `#quick_access` - 观看历史/追剧快捷入口
   - `#modHistory` - 历史记录模块

3. **左侧导航**
   - `.logo-wrap` - Logo
   - `.nav-wrap` - 导航菜单 `.nav-item`

4. **主内容区**
   - `.video-flow` - 视频分类标签页
   - `#channel-page-scroller` - 频道滚动内容
   - `#web-focus` - 焦点视频播放器 `.video-focus__player`
   - `.video-focus__banner` - 横幅推荐

---

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `#searchBoxSdk` | 隐藏的空容器，搜索功能已由 `#searchForm` 提供 |
| `#modApp` / `#app_pop` | APP下载弹窗，临时推广内容 |
| `#pc_client` | 客户端下载推荐 |
| `#mod_head_notice_pop` | 空的用户通知弹窗 |
| `#mod_notlogin_pop` | 未登录弹窗 |
| `.nav-login-panel-sdk` | 导航栏登录面板SDK容器 |
| `.toast-wrap` | 临时提示消息容器 |
| `#login_win` | 登录窗口 |
| `#svg-icon__btn-vip` | VIP按钮图标（隐藏） |
| `#toast-container` | Toast通知容器 |
| `#recovery_mini_player` | 迷你播放器（临时） |
| `.quick_item quick_games` | 游戏快捷入口（重复内容） |
| `.quick_item quick_vip` | VIP快捷入口（重复） |
| `.drm-recording-notice` | DRM录制提示 |
| `.video-focus__sponsor` | 赞助内容 |
| `.focus-img` | 隐藏的对焦图片 |

---

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `pwa-sc---kVsO` | B站内部CSS模块哈希，随构建变化 |
| `pwa-sc__arrow--dYvoF` | B站CSS Modules哈希标识符 |
| `pwa-sc__row--jblbp` | B站CSS Modules哈希标识符 |
| `.triangle_line` | 通用三角箭头类，多处重复使用 |
| `#quickPopTabs` | ID模式可能因页面变化 |

---

### 过滤后的结构树

```
web-page
├── top-nav-wrap
│   ├── searchForm (#keywords input, .search-btn-wrap)
│   └── ssi-user-bar
│       ├── quick_access (历史/追剧)
│       ├── modHistory (标签: 历史/追番/订阅)
│       ├── modCreate (创作中心)
│       ├── quick_vip (会员)
│       ├── modMore (更多菜单)
│       └── mod_head_user (用户信息/登录)
├── left-nav-wrap
│   ├── logo-wrap
│   └── nav-wrap (.nav-item ×N)
└── content-wrap
    └── channel-main-container
        └── flex-container
            ├── video-flow (.video-flow__tablist ×N)
            └── channel-page-scroller
                ├── web-focus
                │   ├── video-focus__player (#vod-focus-play-wrap)
                │   └── video-focus__banner
                ├── channel-page__tips
                └── scroll-rec
```
