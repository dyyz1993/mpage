# dianping.yaml

## 原始结构

```
#__next: [i:1 t:11 16.6KB→1.1KB]
  .home_old_root: [i:1 t:34 16.6KB→1.1KB]
    .header-wrapper: [i:1 t:1 1.5KB→125B]
      .padding-div-pc: [i:1 t:1]
        .city-select-content: [div]
          .city-select-text: [t:1]
          .city-select-drop: [div]
        .search-bar: [i:1]
          #myInput: [search]
          #searchBtn: [input]
            .search-img: [div]
      .header-r-desc-pc: [t:3]
        .header-service: [div]
        .header-help: [div]
        .self-outline-wrapper: [div]
        .open-app-button: [t:1]
    .recommend-module null: [10.9KB→776B]
      .my-masonry-grid null: [t:30 ×5 10.9KB→776B]
        .my-masonry-grid_column null: [×2 2.2KB→153B]
          .card: [t:3 1KB→71B]
            .info: [div]
              .title: [t:1]
              .face: [div]
              .like: [div]
                .seed-comment-like-icon-dp: [div]
                .like-count: [t:1]
#openAppLaunchModalPC: [l:2 t:9 1.4KB→241B]
  .oap-mask: [div]
  #oapWide: [l:1 t:4]
    .oap-text: [t:1 ×2]
    .oap-qrcode-wrap: [div]
      .oap-qrcode-img-wrap: [div]
        #openAppLaunchModalPCQrCodeImg: [h]
    .oap-close: [div]
    .oap-download-wrap: [l:1 t:3]
      .oap-line-one: [t:3]
      .oap-line-two: [l:1 t:1]
  #oapNarrow: [l:1 t:1]
    .oap-close: [div]
    .oap-narrow-text: [t:1 ×2]
    .oap-narrow-qrcode-wrap: [div]
      .oap-narrow-qrcode-img-wrap: [div]
        .oap-narrow-qrcode-img: [modal h]
    .oap-narrow-qrcode-btn: [t:1]
    .oap-narrow-qrcode-download: [l:1 t:1]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构
- `.__next` / `.home_old_root` - 应用根容器
- `.header-wrapper` - 页头容器
- `.city-select-content` - 城市选择功能
- `.search-bar` / `#myInput` - 搜索功能
- `.recommend-module` - 推荐内容区
- `.my-masonry-grid` - 瀑布流网格布局
- `.card` - 内容卡片
- `.title` / `.like` / `.like-count` - 卡片交互元素

### 建议删除的内容
| 选择器 | 删除原因 |
|--------|----------|
| `#openAppLaunchModalPC` | App下载推广弹窗，干扰用户操作 |
| `.oap-mask` | 弹窗遮罩层 |
| `#oapWide` | PC端宽屏弹窗内容 |
| `#oapNarrow` | PC端窄屏弹窗内容 |
| `.oap-close` | 弹窗关闭按钮（随弹窗删除） |
| `.open-app-button` | 打开App引导按钮（推广） |

### 不稳定的模式
| 模式 | 原因 |
|------|------|
| `#__next` | Next.js Portal根，框架内部实现 |
| `#openAppLaunchModalPCQrCodeImg` | 弹窗内图片ID |

### 过滤后的结构树
```
.home_old_root
├── .header-wrapper
│   ├── .city-select-content
│   │   ├── .city-select-text
│   │   └── .city-select-drop
│   └── .search-bar
│       └── #myInput
└── .recommend-module
    └── .my-masonry-grid
        └── .card (×5)
            └── .info
                ├── .title
                ├── .face
                └── .like
                    ├── .seed-comment-like-icon-dp
                    └── .like-count
```
