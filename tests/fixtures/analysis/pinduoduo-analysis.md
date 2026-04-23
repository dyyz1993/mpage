# pinduoduo.yaml

## 原始结构

```
#__next: [t:82 25.9KB→5.2KB]
  .pdd-head-wrapper: [1.4KB→340B]
    .pdd-head: [t:10 1.3KB→340B]
      .logo: [div]
      .menu: [list 1.1KB→327B]
  #index: [t:74 19.1KB→3.7KB]
    .body: [t:76 18.6KB→3.6KB]
      .title-group: [l:1]
        .title: [t:1]
      .content-group: [l:4]
      .title-group: [l:1]
        .title: [t:1]
      .content-group: [t:72 17.7KB→3.5KB]
    .pdd-left-code: [div]
      .pdd-left-code-container: [t:2]
        .pdd-left-code-container-desc: [×2]
  .pdd-foot: [t:8 5.3KB→1.2KB]
    .pdd-foot-head: [t:7 1.1KB→313B]
      .qrcode-group: [t:3 ×3]
      .contact-info: [div]
    .pdd-bottom-nav: [t:12 1.2KB→409B]
      .pd-nav-list: [×12 1.1KB→409B]
        .pd-nav-list-item: [t:1]
    .pdd-foot-cr: [l:1]
    .pdd-foot-medicine: [l:3]
    .pdd-foot-record: [l:3 t:4]
    .pdd-foot-medicine: [t:1]
    .foot-ft: [l:7 1KB→91B]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- **.pdd-head-wrapper / .pdd-head** - 网站头部容器
- **.menu** - 导航菜单
- **#index .body** - 主内容区域
- **.content-group** - 正文内容容器
- **.pdd-foot** - 底部区域框架

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| .pdd-left-code | 左侧代码/推广区域，非核心内容 |
| .pdd-left-code-container | 同上 |
| .pdd-left-code-container-desc | 同上 |
| .qrcode-group | 二维码推广信息 |
| .pdd-bottom-nav | 底部导航，影响阅读 |
| .foot-ft | 底部链接列表，可选删除 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| #__next | React 框架根元素，版本变化会改变 |
| .pdd-* | 拼多多特定类名，非标准 CSS 类，可能随版本更新变化 |
| .title-group, .content-group | 可能是动态生成的容器结构 |

### 过滤后的结构树

```
#__next
  .pdd-head-wrapper
    .pdd-head
      .logo
      .menu
  #index
    .body
      .title-group
        .title
      .content-group [×4]
  .pdd-foot
    .pdd-foot-head
      .contact-info
    .pdd-foot-cr
    .pdd-foot-medicine
    .pdd-foot-record
```

**总结**：核心内容在 `#index .body` 下的 `.content-group` 中，头部菜单应保留以便导航。底部 `.pdd-foot` 中备案信息可保留，二维码和导航可删除以提升阅读体验。
