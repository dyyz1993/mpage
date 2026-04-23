# qunar.yaml

## 原始结构

```
#app: [t:16 8.6KB→1.1KB]
  .home: [t:16 8.6KB→1.1KB]
    .home-pc: [t:15 5.6KB→730B]
      .header-pc: [1.5KB→241B]
        .logo pointer: [l:1]
        .nav: [l:10 1.4KB→224B]
      .home-container: [t:5 4KB→489B]
        .home-content: [l:5 1.6KB→95B]
          .main-img: [l:1]
            .main-bg: [l:1]
              .main-content: [l:1]
                .qr-code: [div]
                .business-list: [l:1 ×4]
                  .business-item: [div]
          .center-w1200: [×2]
          .center-w1200 cooperate: [l:1]
            .cooperate-btn-bg: [l:1]
        .footer-pc: [l:9 t:5 2.3KB→394B]
          .footer-top-line: [div]
          .footer-text: [l:5 t:5 ×2]
            .text-line: [l:5 t:5 ×3]
              .text-inline: [t:1]
          .footer-link: [l:4 1.3KB→28B]
            .link-item: [div]
    .home-touch: [l:5 t:1 3KB→391B]
      .home-touch-header: [div]
      .home-touch-banner: [div]
      .home-touch-service: [1.8KB→16B]
        .service-title: [t:1]
        .service-card-list: [×8 1.7KB]
          .touch-service-card: [div]
            .block-img: [div]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `#app` / `.home` - 根容器
- `.home-pc` - PC主容器
- `.header-pc` - 头部导航
  - `.logo` - Logo（可点击）
  - `.nav` - 导航链接（l:10）
- `.home-container` - 主内容区
  - `.home-content` - 核心内容
    - `.main-img` / `.main-bg` - 主图区域
    - `.main-content` - 主要内容
      - `.qr-code` - 二维码
      - `.business-list` - 业务列表（×4）
- `.footer-pc` - 页脚
  - `.footer-link` - 页脚链接
  - `.link-item` - 链接项
- `.home-touch` - 移动端容器（如需响应式）

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.main-bg` | 背景装饰图，无交互 |
| `.cooperate-btn-bg` | 合作按钮背景装饰 |
| `.footer-top-line` | 装饰性分隔线 |
| `.text-line` | 纯文本标签，无交互 |
| `.block-img` | 卡片装饰图片 |
| `.service-title` | 纯文本说明 |
| `.center-w1200` (第二个) | 重复/空白占位容器 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| 无明显框架哈希 | 结构相对稳定 |
| `.home-touch` | 移动端可按需删除 |

### 过滤后的结构树

```
#app
  .home
    .home-pc
      .header-pc
        .logo [link]
        .nav [links×10]
      .home-container
        .home-content
          .main-img
            .main-content
              .qr-code [div]
              .business-list [×4]
                .business-item [div]
        .footer-pc
          .footer-link
            .link-item [×4]
```
