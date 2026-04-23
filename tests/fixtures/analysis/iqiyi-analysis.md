# iqiyi.yaml

## 原始结构

```
#root: [i:1 t:442 286.1KB→12.3KB]
  .app_AppPlayer__axZKa: [h]
  .app_App__K8HqS: [i:1 t:164 285.9KB→12.3KB]
    .pages_pages__UkzcY: [i:1 t:442 285.9KB→12.3KB]
      .fullLayer_pageBk__8xmct: [div]
      .pages_bgCommon__1fFoq: [div]
      #topbar: [i:1 t:22 13.2KB→1017B]
        #bk_cover: [div]
        #leftBtns: [div]
        .topbar_flexArea__aQyJC: [i:1 t:30 ×2 9.6KB→770B]
          #emptyArea: [div]
        #pcw_topbar: [t:8 3.5KB→247B]
          #btn_vipBtnB: [div]
            #icon: [div]
            #text: [t:1]
            #cover: [div]
            #gradientBorder: [div]
          #btn_vipBtnS: [div]
            #icon: [div]
            #text: [t:1]
            #cover: [div]
            #gradientBorder: [div]
          #btn_weatherBtn: [div]
            #icon: [div]
            #text: [t:1]
            #cover: [div]
            #gradientBorder: [div]
          #btn_gameBtn: [div]
            #icon: [div]
            #text: [t:1]
            #cover: [div]
            #gradientBorder: [div]
          #btn_uploadBtn: [div]
            #icon: [div]
            #text: [t:1]
            #cover: [div]
            #gradientBorder: [div]
          #clientBtn: [div]
            #icon: [div]
            #text: [t:1]
            #cover: [div]
            #gradientBorder: [div]
          #pwaBtn: [t:5 1.2KB→113B]
            .pwaguide-entry-box: [div]
              .pwaguide-entry-box-icon: [div]
              .pwaguide-entry-box-text: [t:1]
            .pwaguide-tip-content: [div]
              .pwaguide-tip-title: [t:1]
              .pwaguide-tip-desc: [t:1]
            .pwaguide-tip-divider: [div]
            .pwaguide-tip-content: [div]
              .pwaguide-tip-title: [t:1]
              .pwaguide-tip-desc: [t:1]
          #btn_msgBellBtn: [div]
            #icon: [div]
            #text: [t:1]
            #cover: [div]
            #gradientBorder: [div]
      .pages_page__o3Cjc: [t:89 244.5KB→9.7KB]
        .pages_container__t6j9W: [t:370 244KB→9.6KB]
          .pages_page_item__0Z0DF: [t:89 244KB→9.6KB]
            #card_page: [t:370 243.9KB→9.6KB]
              .videoSlide_normal__10Um1: [l:8 t:6 ×2 12.2KB→346B]
              .videoCards_leftMargin__c+Ian: [t:8 29.4KB→937B]
                .videoCards_tabListBg__UPa+d: [t:3]
                  .undefined undefined: [div]
                    #tab: [t:3]
                      .tabList_listwrap__PsDqY: [t:3]
                        .videoCards_tab_btn__RXUQe: [×2]
                    #content: [div]
                .cardMemos_cardLabels__7CYS8: [div]
              .videoCards_leftMargin__c+Ian: [l:6 t:3 5.6KB→185B]
                .list_container__SwwRM: [l:6 t:3 5.5KB→185B]
                  .list_list__szAbP: [l:6 t:3 5.4KB→185B]
              .videoCards_leftMargin__c+Ian: [t:351 196.3KB→8.2KB]
                .undefined undefined: [div]
                .compFuncs_simpleWrap__16zQA: [t:51 ×21 195.8KB→8.2KB]
                  #undefined_1: [feed l:4 t:17 9.4KB→396B]
                    .filmFeed_feedbackWrap__Gdytk: [1.8KB→124B]
                      .filmFeed_fbEntry__7bbSx: [1.6KB]
                      .filmFeed_fbUl__-JBO6: [t:6]
                        .filmFeed_fbinnerUl__5eNHB: [list]
                          #head: [t:1]
                    .filmFeed_desc__gTqiu: [t:1]
                    .metas_row3__g8cHS: [t:9 ×9 2.1KB→179B]
                .pageBottom_container__5pUrx: [div]
        .backTop_sideTools__Wecas: [t:2]
          .backTop_backtopNew__f+5W0: [h]
            #text: [h t:1]
            #icon: [h]
          .backTop_feedbackNew__5qW-a: [div]
            #text: [t:1]
            #icon: [div]
        .pages_sustainCommon__tl-bX: [div]
        .pages_tipCommon__DgREh: [div]
        .pages_normalCover__O7Hzf: [div]
      .pages_side__pWNLH: [t:53 27.9KB→1.7KB]
        .side_container__-kzh4: [t:53 27.9KB→1.7KB]
          .side_outer__3YlZN: [t:32 27.8KB→1.7KB]
            .side_sideCompanyInfo__BcR3n: [t:27 12.9KB→1.1KB]
              .side_sideBorder__xi20G: [div]
            .side_allChBtnLine__dKfy7: [div]
            .side_leftBlock__d6Hac: [div]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构
- `#topbar` - 顶部导航栏（重要交互入口集合）
  - `#btn_vipBtnB`, `#btn_vipBtnS` - VIP按钮
  - `#btn_weatherBtn` - 天气按钮
  - `#btn_gameBtn` - 游戏按钮
  - `#btn_uploadBtn` - 上传按钮
  - `#clientBtn` - 客户端按钮
  - `#btn_msgBellBtn` - 消息铃铛
- `.pages_page__o3Cjc` - 页面主内容区域
  - `.videoCards_tabListBg__UPa+d` - 视频分类Tab
  - `.compFuncs_simpleWrap__16zQA` - 视频列表/Feed
- `.pages_side__pWNLH` - 侧边栏

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `#pwaBtn` | PWA安装引导插件（pwaguide-前缀），临时引导内容 |
| `#pwaBtn .pwaguide-entry-box, .pwaguide-tip-content` | PWA引导弹窗元素 |
| `.filmFeed_feedbackWrap__Gdytk` | 反馈悬浮层容器 |
| `.backTop_sideTools__Wecas` | 返回顶部和反馈的侧边悬浮工具 |
| `.pages_sustainCommon__tl-bX` | 运营维持内容容器 |
| `.pages_tipCommon__DgREh` | 提示信息容器 |
| `.pages_normalCover__O7Hzf` | 页面覆盖层（可能是空或临时） |
| `.fullLayer_pageBk__8xmct` | 全屏背景层 |
| `.pages_bgCommon__1fFoq` | 背景装饰层 |
| `.videoSlide_normal__10Um1` | 视频滑动区（嵌套在tab外，可能是多余） |
| `.cardMemos_cardLabels__7CYS8` | 卡片标签（运营标签） |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `.___` (CSS Module哈希) | 每次构建变化，如 `__axZKa`, `__K8HqS` |
| `.undefined undefined` | 未定义组件，类名不规范 |
| `#undefined_1` | 未定义ID的Feed项 |
| `#topbar .topbar_flexArea__aQyJC` | 内部布局类名 |
| `.videoCards_leftMargin__c+Ian` | 含特殊字符`+`，CSS Module命名 |

### 过滤后的结构树

```
#root
└── .app_App__K8HqS
    └── .pages_pages__UkzcY
        └── #topbar
            ├── #bk_cover
            ├── #leftBtns
            ├── .topbar_flexArea__aQyJC
            │   └── #emptyArea
            └── #pcw_topbar
                ├── #btn_vipBtnB
                ├── #btn_vipBtnS
                ├── #btn_weatherBtn
                ├── #btn_gameBtn
                ├── #btn_uploadBtn
                ├── #clientBtn
                ├── #pwaBtn (建议删除)
                └── #btn_msgBellBtn
        └── .pages_page__o3Cjc
            └── .pages_container__t6j9W
                └── .pages_page_item__0Z0DF
                    └── #card_page
                        ├── .videoCards_tabListBg__UPa+d
                        │   ├── #tab
                        │   └── #content
                        └── .videoCards_leftMargin__c+Ian (×2, 合并)
                            └── .list_container__SwwRM
                                └── .list_list__szAbP
        └── .pages_side__pWNLH
            └── .side_container__-kzh4
                └── .side_outer__3YlZN
                    ├── .side_sideCompanyInfo__BcR3n
                    ├── .side_allChBtnLine__dKfy7
                    └── .side_leftBlock__d6Hac
```

**主要发现**：该页面是典型的视频平台结构，核心内容在 `#card_page` 下的Tab和Feed区域。删除 PWA引导、返回顶部工具和运营覆盖层后，可聚焦核心交互区域。
