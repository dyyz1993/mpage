# indeed.yaml

## 原始结构

```
#logo-src: [h 6.9KB→6B]
#hamburger-src: [h]
#root: [b:1 t:4 10.4KB→576B]
  .gnav: [b:1 t:10 9.1KB→351B]
    .gnav-nav: [l:4 7.3KB→123B]
      .gnav-nav-list: [l:3 t:3]
    .gnav-links: [b:1 l:6 1.5KB→196B]
      .gnav-links-button: [button]
      .gnav-links-list: [l:6 t:6 ×3]
        .gnav-mobile-link: [l:1]
          #findJobsMobile: [t:1]
  .error: [main l:3 t:5 1.3KB→225B]
    #heading: [t:1]
    #paragraph: [t:1]
    #cf-box-container: [t:1]
      .main-wrapper: [t:1]
        .main-content: [t:1]
          #YqYak7: [h2]
          #jxHnX1: [p]
          #AOzYg6: [div]
            #cf-chl-widget-4wdu0_response: [h]
          #YtLM0: [h]
          #stNu6: [h]
            .lds-ring: [h ×4]
    #returnHome: [t:1]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构
- `#root` - 应用根容器
- `.gnav` - 导航栏（包含 `.gnav-nav` 和 `.gnav-links`）
- `.gnav-mobile-link` - 移动端导航链接
- `#returnHome` - 返回首页链接
- `.error main` - 错误信息主容器
- `#heading`, `#paragraph` - 错误提示文本

### 建议删除的内容
| 选择器 | 删除原因 |
|--------|----------|
| `#logo-src` | 隐藏的骨架屏/占位符，无实际功能 |
| `#hamburger-src` | 隐藏的骨架屏/占位符，无实际功能 |
| `.lds-ring` | 加载动画，临时交互状态 |
| `#cf-box-container` 及其子元素 | Cloudflare 验证弹窗，用户验证完成后消失 |

### 不稳定的模式
| 模式 | 原因 |
|------|------|
| `#YqYak7`, `#jxHnX1`, `#YtLM0`, `#stNu6` | Cloudflare 随机生成的哈希 ID，每次刷新变化 |
| `#cf-chl-widget-4wdu0_response` | Cloudflare Challenge Widget 组件，ID 包含版本哈希 |
| `.lds-ring` 内的 4 个子元素 | 加载动画 DOM 结构不稳定 |

### 过滤后的结构树
```
#root
├── nav.gnav
│   ├── .gnav-nav
│   │   └── .gnav-nav-list
│   └── .gnav-links
│       ├── .gnav-links-button
│       └── .gnav-links-list
│           └── .gnav-mobile-link
│               └── #findJobsMobile
└── main.error
    ├── #heading [错误标题]
    ├── #paragraph [错误说明]
    └── #returnHome [返回链接]
```
