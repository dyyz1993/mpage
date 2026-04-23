# netlify.yaml

## 原始结构

```
.site-header: [i:1 b:10 t:69 68.1KB→2.9KB]
  .wrapper l-breakout: [section i:1 b:10 t:34 68KB→2.9KB]
    #site-nav: [b:7 t:53 46.3KB→2.2KB]
      #site-nav-label: [t:1]
      #mainNav-netlifyLogo: [4.5KB→31B]
      .skip-to-content: [t:1]
      .menu: [list b:1 l:1 t:1 1KB→70B]
        #main-nav-compact-search: [button]
      #main-nav-compact-hamburger: [button]
      .menu: [list b:5 t:14 ×5 39.6KB→2KB]
        .has-submenu: [b:1 l:9 t:12 3.8KB→534B]
          #main-nav-platform: [t:1]
          #platform-submenu: [l:9 t:12 ×2 2.8KB→463B]
            .section l-stack: [l:1 t:1]
              .l-stack: [list l:1 t:1]
      #signup: [t:1]
    .n-search-container: [h i:1 b:3 l:4 t:15 20.9KB→626B]
      .n-search-input-wrapper: [h i:1 b:1 t:1 1.7KB→66B]
        .n-search-label: [h t:1 1.5KB→27B]
          .n-search-icon: [h 1.4KB→11B]
            #icon-search: [h t:1 1.3KB→11B]
        .n-search-input: [h]
        .n-search-input-clear: [h t:1]
      .n-search-window: [h b:2 l:4 t:14 18.8KB→461B]
        .n-search-links: [h b:2 l:4 t:7 18.7KB→461B]
          .n-search-link: [h t:3 3.7KB→99B]
            .n-search-link-icon: [h 2.7KB→11B]
              #icon-askNetlify: [h t:1 ×7 2.7KB→11B]
                #ask-netlify-tick-3: [h]
            .n-search-link-body: [h t:1]
              .n-search-link-title: [h]
                .n-search-link-label: [h t:1]
              .n-search-link-excerpt: [h t:1]
            .n-search-link-icon: [h]
              #icon-caretRight: [h t:1]
          .n-search-heading: [h t:1]
          .n-search-link: [h t:2 2.3KB→53B]
            .n-search-link-icon: [h 1.3KB→11B]
              #icon-lightbulb: [h t:1 1.3KB→11B]
            .n-search-link-body: [h t:1]
              .n-search-link-title: [h]
                .n-search-link-label: [h t:1]
            .n-search-link-icon: [h]
              #icon-caretRight: [h t:1]
      .n-search-footer: [h t:1 ×2]
        .n-search-footer-tip: [h t:2]
#main: [b:10 t:679 ×5 138.2KB→12.2KB]
  #section-logos: [7.8KB→368B]
    .n-ticker: [×2 7.7KB→368B]
      .n-ticker-content: [×11 3.7KB→184B]
        .n-trust-bar-ticker-item: [div]
.wrapper | l-cluster: [l:7 t:8 9.1KB→340B]
  #cta-footer-netlifyLogo: [2.1KB→39B]
  .social | l-cluster: [list l:6 6.9KB→301B]
.section l-stack: [l:8 t:1 1.7KB→283B]
  .l-stack l-stack-xs: [list l:8 t:8 1.2KB→262B]
#hubspot-form-site-footer: [div]
.hs-form l-cluster: [i:1 b:1 t:6 ×7 1.4KB→213B]
  .hs-form-field: [i:1]
    #email: [input]
.wrapper | l-cluster: [b:1 l:4 1.2KB→186B]
  .legal | l-cluster: [list b:1 l:4 t:5 1.1KB→162B]
.ask-netlify-button: [b:1 1.6KB→23B]
  #cta-ask-netlify-chat: [t:1 1.5KB→23B]
#onetrust-consent-sdk: [b:3 l:1 t:3 ×2 1.6KB→275B]
#hs-interactives-modal-overlay: [active]
.grecaptcha-badge: [div]
  .grecaptcha-logo: [div]
  .grecaptcha-error: [div]
  #g-recaptcha-response-100000: [h]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `.site-header` - 网站导航头
- `#site-nav` - 主导航容器
- `.menu` (主菜单) - 包含主要导航链接
- `.has-submenu` / `#platform-submenu` - 平台子菜单
- `#main` - 页面主要内容区域
- `.wrapper | l-cluster` (页脚区域) - 页脚 Logo 和内容
- `.social | l-cluster` - 社交媒体链接
- `.legal | l-cluster` - 法律/版权链接
- `.hs-form` / `#email` - 邮件订阅表单

---

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `#site-nav-label` | 纯文本标签，无交互功能 |
| `.skip-to-content` | 跳过链接，一次性可访问性元素 |
| `.n-ticker` / `.n-trust-bar-ticker-item` | 信任徽章滚动动画，无实质内容 |
| `.ask-netlify-button` | 推广/助手按钮，干扰用户 |
| `#onetrust-consent-sdk` | Cookie 同意弹窗，用户需手动关闭 |
| `#hs-interactives-modal-overlay` | HubSpot 弹窗覆盖层，临时交互 |
| `.grecaptcha-badge` | reCAPTCHA 调试徽章 |

---

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `#icon-search`, `#icon-askNetlify`, `#icon-lightbulb`, `#icon-caretRight` | 图标 ID 可能随构建版本变化 |
| `#ask-netlify-tick-3` | 搜索建议图标，ID 含序号 |
| `.n-search-*` 容器 | 搜索功能隐藏元素，预加载的占位内容 |
| `#cta-ask-netlify-chat` | 特定营销按钮 ID |

---

### 过滤后的结构树

```
.site-header
  #site-nav
    .menu (主导航)
      #main-nav-compact-search
      #main-nav-compact-hamburger
      .menu (子菜单)
        .has-submenu
          #main-nav-platform
          #platform-submenu
    #signup
#main
  #section-logos
.wrapper (页脚)
  #cta-footer-netlifyLogo
  .social
  .section
    .l-stack
#hubspot-form-site-footer
  .hs-form
    #email
.wrapper (法律信息)
  .legal
```
