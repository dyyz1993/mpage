# reddit.yaml

## 原始结构

```
#shreddit-skip-link: [button t:1]
.contents nd:visible: [i:1 b:3 l:4 t:6 24.9KB→469B]
  #hamburger-button-tooltip: [b:1 t:1 1.7KB→53B]
    .relative nd:visible: [b:1 1.4KB→28B]
      #navbar-menu-button: [button]
      .h-[40px] absolute top-0 end-0: [div]
#reddit-chat: [3.2KB]
#subgrid-container: [header t:99 196.1KB→7KB]
  #main-content: [t:74 167.2KB→5.6KB]
  #right-sidebar-container: [header t:25 ×2 28.1KB→1.4KB]
    #right-sidebar-contents: [l:9 t:21 25.2KB→1.3KB]
      #right-rail-experience-root: [sidebar]
  #right-rail-entity-panel-root: [sidebar]
#left-sidebar-container: [b:2 t:7 57.1KB→1.4KB]
  #flex-left-nav-container: [b:2 t:26 ×2 56.9KB→1.4KB]
    #flex-nav-buttons: [b:2 ×2 1.8KB→74B]
      #flex-nav-expand-button: [button]
.grecaptcha-badge: [1.1KB→37B]
  .grecaptcha-logo: [div]
  .grecaptcha-error: [div]
  #g-recaptcha-response-100000: [h]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `.contents` - 主内容区域，帖子信息
- `#main-content` - 页面主要内容容器
- `#left-sidebar-container` / `#flex-left-nav-container` - 左侧导航
- `#navbar-menu-button` - 顶部导航菜单按钮
- `#right-sidebar-contents` - 右侧边栏信息卡

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `#reddit-chat` | 临时聊天功能，无实际内容 |
| `.grecaptcha-badge` | reCAPTCHA 验证元素，第三方调试残留 |
| `#right-rail-entity-panel-root` | 右侧面板冗余实例 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `#right-sidebar-container` 出现 ×2 | 右侧栏渲染了两次，存在版本不稳定问题 |
| `#flex-nav-buttons` 出现 ×2 | 左侧导航按钮重复渲染 |

### 过滤后的结构树

```
html
└── body
    ├── #shreddit-skip-link (accessibility)
    ├── .contents (main content)
    │   └── [post elements]
    ├── #subgrid-container
    │   ├── #main-content (primary)
    │   ├── #right-sidebar-container
    │   │   └── #right-sidebar-contents
    │   └── #left-sidebar-container
    │       └── #flex-left-nav-container
    │           └── #flex-nav-buttons
    └── #hamburger-button-tooltip
        └── #navbar-menu-button
```
