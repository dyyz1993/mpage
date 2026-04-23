# jd.yaml

## 原始结构

```
.mod_container: [i:2 b:1 t:167 ×7 158.6KB→9.5KB]
  #J_accessibility: [t:2]
#app: [t:262 149.3KB→21.3KB]
  #J_app: [t:122 149.3KB→21.3KB]
    #J_feeds: [t:254 146.6KB→21.1KB]
      .more2: [t:116 146.5KB→21.1KB]
        .grid_c1 floorhd_inner: [div]
        #J_feeds_tab_wrap: [t:21 6.7KB→817B]
          #feedsTabWrapper: [6.7KB→817B]
            .feeds-tab-box: [t:21 6.4KB→811B]
              #feedsTabWrapperInner: [6.4KB→811B]
                .feeds-tab: [list t:21 ×21 6.3KB→811B]
                  #feedTab1: [item]
                    .feeds-tab__item-img: [div]
                    .feeds-tab__item-title: [t:1]
            .feeds-tab-arrows: [div]
              .feeds-tab-right-arrow-cover: [div]
              .feeds-tab-right-arrow: [div]
        .grid_c1 more2_inner: [t:232 139.6KB→20.3KB]
          #feedContent0: [list t:232 ×56 139.4KB→20.3KB]
            .more2_info: [l:3 t:4 1.6KB→314B]
              .more2_info_add_cart: [h]
            .more2_item_hover: [div]
              .more2_item_delete: [div]
            .hover-border: [div]
          .more2_loading: [div]
    #right-bottom-float-badge: [div]
    .site-mail-spread scale-down: [t:8 1.9KB→198B]
      .site-mail-spread-content: [t:6 1.8KB→198B]
        .site-mail-header: [t:4]
          .site-mail-price-box: [t:1]
            .site-mail-spread-price: [t:1]
            .site-mail-spread-desc: [t:1]
          .site-mail-sperator: [div]
          .site-mail-benefit-box: [div]
            .site-mail-benefit-limit: [t:1]
            .site-mail-benefit-time: [t:1]
          .site-mail-btn: [t:1]
        .site-mail-sku-box: [t:4 1.2KB→98B]
          .site-mail-sku-list: [t:4 ×4 1.2KB→98B]
            .site-mail-sku-item: [t:1]
              .site-mail-sku-item-img: [div]
              .site-mail-sku-item-price: [t:1]
    #guide-login-bar: [l:1]
      .login-bottom-bar-content: [l:1]
        .login-bottom-bar-left: [div]
          .login-bottom-bar-left-icon: [div]
        .login-bottom-bar-right: [l:1]
    #globalToast: [div]
      .global_toast_icon: [div]
      .global_toast_text: [div]
    #halo: [h]
#J_footer: [t:80 14.2KB→2.1KB]
  .mod_service: [1.1KB→183B]
    .grid_c1 mod_service_inner: [t:8]
      .mod_service_list: [ul]
  .mod_help: [t:30 5.3KB→754B]
    .grid_c1 mod_help_inner: [5.2KB→754B]
      .mod_help_list: [t:30 ×5 5.1KB→754B]
        .mod_help_nav: [l:6 1.2KB→173B]
          .mod_help_nav_tit: [t:1]
          .mod_help_nav_con: [l:6 t:6 1.1KB→156B]
  .mod_copyright: [7.8KB→1.2KB]
    .grid_c1 mod_copyright_inner: [t:72 7.7KB→1.2KB]
      .mod_copyright_info: [3.8KB→667B]
        .mod_copyright_cert: [t:29 3.2KB→560B]
        .mod_copyright_subsites: [l:2 t:6]
.jdmcc_elevator: [l:7 t:3 15.2KB→462B]
  #jdccm-elevator: [l:7 t:6 13.1KB→313B]
    .elevator_list: [l:6 t:1 ×6 2.3KB→239B]
      #Cart: [item l:1 t:2]
    .elevator_bottom: [l:1 t:1]
  #jdmccProductImgWrap: [div]
  #jdmccBagWrap1: [div]
  #jdmccBagWrap2: [div]
    #jdmccBagLogoUnder: [h]
  #jdmccBagWrap3: [div]
    #jdmccBagGif: [h]
  #jdmccBagCover: [h]
  #jdmccBagHandle: [h]
  #jdmccBagLogo: [h]
#J_channelDrawer: [t:78 17.8KB→1.5KB]
  #drawer-container: [t:4 17.8KB→1.5KB]
    #drawer: [t:78 17.7KB→1.5KB]
      .drawer-title: [div]
      .drawer-title-list: [×4]
        .drawer-title-font: [t:1]
          .title-line: [div]
      #nextLevel0: [t:14 3.7KB→295B]
        .seconed-title: [t:1]
        .thrid-level: [3.6KB→281B]
          #thrid-box: [t:14 ×14 3.6KB→281B]
            #thrid-box-s: [div]
              .thrid-name: [t:1]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `#J_feeds` / `#J_feeds_tab_wrap` - 核心内容区与Tab切换
- `#feedContent0` - 商品列表主体（×56项核心数据）
- `.more2_info` - 商品详情卡片
- `.hover-border` - 商品项容器
- `.jdmcc_elevator` - 右侧导航电梯（含购物车入口 `#Cart`）
- `.mod_help` / `.mod_copyright` - 页脚帮助与版权信息

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.more2_loading` | 骨架屏加载占位符 |
| `.site-mail-spread` | 推广弹窗/营销横幅 |
| `#guide-login-bar` | 登录引导栏 |
| `#globalToast` | Toast通知提示 |
| `#halo` | 隐藏空容器 |
| `#J_accessibility` | 无障碍辅助元素 |
| `#right-bottom-float-badge` | 右下角浮动徽章 |
| `.feeds-tab-arrows` | Tab切换箭头装饰 |
| `#J_channelDrawer` | 侧边分类抽屉（临时交互） |
| `#jdmccBagWrap1/2/3` | 购物车动画装饰元素 |
| `#jdmccBagLogoUnder` `#jdmccBagGif` `#jdmccBagCover` `#jdmccBagHandle` `#jdmccBagLogo` | 购物车装饰/动画（隐藏） |
| `#jdmccProductImgWrap` | 产品图片包装（装饰） |
| `.mod_service` | 服务信息（辅助说明） |
| `.mod_copyright_cert` | 证书信息（纯文本） |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `#nextLevel0` `#thrid-box` `#thrid-box-s` | 动态生成的分类导航ID |
| `.drawer-title-list` | 侧边抽屉内嵌结构 |
| `.jdmcc_elevator` 内部 `#jdccm-elevator` | 组件生成的ID/类名 |
| `.grid_c1 floorhd_inner` / `more2_inner` | 布局容器的动态类名 |

### 过滤后的结构树

```
#app
└── #J_feeds
    └── #J_feeds_tab_wrap
        └── .feeds-tab-box
            └── .feeds-tab (×21)
                └── #feedTab1
    └── #feedContent0 (×56)
        ├── .more2_info (商品信息)
        └── .hover-border (商品容器)
├── .jdmcc_elevator
│   └── #Cart (购物车入口)
├── .mod_help
│   └── .mod_help_list (×5)
└── .mod_copyright
    └── .mod_copyright_info
```
