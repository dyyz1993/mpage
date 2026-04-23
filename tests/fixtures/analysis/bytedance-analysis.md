# bytedance.yaml

## 原始结构

```
#__next: [b:6 l:10 t:72 355.7KB→4.7KB]
  #app-container: [b:6 l:10 t:98 355.7KB→4.7KB]
    .header-wrapper zh: [l:1 5.9KB→98B]
      .jsx-3738640256 header zh: [l:1 t:5 5.9KB→98B]
        .jsx-3738640256 right: [×5]
          .jsx-4003369422 nav-item: [t:1]
    .header-wrapper-back: [div]
    .bg-ellipse-full-wrapper: [div]
      .bg-ellipse-wrapper: [div]
        .bg-ellipse bg-ellipse-1: [div]
        .bg-ellipse bg-ellipse-2: [div]
        .bg-ellipse bg-ellipse-3: [div]
        .bg-ellipse bg-ellipse-4: [div]
        .bg-ellipse bg-ellipse-5: [div]
        .bg-ellipse bg-ellipse-6: [div]
        .bg-ellipse bg-ellipse-7: [div]
        .bg-ellipse bg-ellipse-8: [div]
    #main: [b:6 l:6 t:59 341.8KB→4.2KB]
      #mission: [div]
      .slick-list: [3.1KB→54B]
        .slick-track: [3.1KB→54B]
          .slick-slide slick-cloned: [div]
          .slick-slide: [×3]
          .slick-slide slick-cloned: [×4]
      .slick-dots: [list b:4 t:4]
        .slick-active: [active b:1]
      #culture: [section b:2 t:15 8.2KB→1.8KB]
        .jsx-1862323653 desc: [t:1]
        .slick-list: [t:13 7.7KB→1.7KB]
          .slick-track: [t:39 7.7KB→1.7KB]
            .slick-slide slick-cloned: [t:1]
              .culture-wrapper: [t:1]
                .desc-container: [list]
            .culture-wrapper: [t:1]
              .desc-container: [list]
            .slick-slide: [t:1 ×5]
            .slick-slide slick-cloned: [t:1 ×6]
      #code-of-conduct: [section l:1 t:1]
        .jsx-1862323653 desc: [l:1 t:2]
      #history: [section t:68 328.5KB→2KB]
        .jsx-266380481 history: [×2 328.4KB→2KB]
          .slick-list: [91.7KB→1.6KB]
            .slick-track: [t:68 ×34 91.7KB→1.6KB]
              .slick-slide: [4KB→43B]
                .stone-wrapper: [3.9KB→43B]
                  .stone-contents: [t:2 3.8KB→43B]
                    .words: [div]
      #contact: [section l:5 t:2 1KB→199B]
        .jsx-139108846 contact-wrapper: [l:5 t:7 ×4]
          .jsx-139108846 contact-item: [l:1]
    #footer: [l:3 t:13 7.5KB→361B]
      .jsx-3066022125 nav-wrapper: [t:4 ×4]
        .jsx-3066022125 nav-item: [t:5]
      .jsx-3066022125 bottom: [l:2 t:3 1.3KB→132B]
        .locale-select: [t:1]
          .jsx-2297393811 dropdown: [t:2]
            .jsx-2297393811 dropdown-label: [t:1]
            .jsx-2297393811 dropdown-menu: [×2]
        .jsx-3066022125 copyright-icp: [l:2]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- **头部导航** `.header-wrapper` > `.header` > `.right` > `.nav-item` ×5
- **主内容区域**
  - `#mission` - 企业使命
  - `#culture` - 企业文化（轮播）
  - `#code-of-conduct` - 行为准则
  - `#history` - 企业历史（轮播）
  - `#contact` - 联系方式
- **页脚** `#footer` > `.nav-wrapper` + `.bottom`

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.header-wrapper-back` | 空容器，无内容 |
| `.bg-ellipse-full-wrapper` 及其所有子元素 `.bg-ellipse-1~8` | 纯装饰性背景，不含实际内容 |
| `.slick-slide.slick-cloned` | Slick 轮播克隆元素，仅用于无缝滚动 |
| `.locale-select` | 语言选择器（非核心功能） |
| `.copyright-icp` | 备案信息，可选保留 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `.jsx-\d+` | Next.js 动态生成的哈希类名，版本更新后会变化 |
| `.bg-ellipse` | 装饰性背景，命名不固定 |
| `.slick-cloned` | 轮播插件克隆元素，内容与原元素重复 |
| `.slick-dots` | 轮播指示器，由插件动态生成 |

### 过滤后的结构树

```
#__next
  .header-wrapper
    header
      .right
        nav-item ×5
  #main
    #mission
    #culture
      .slick-list
        .slick-track
          .slick-slide ×5
          .culture-wrapper
            .desc-container
    #code-of-conduct
    #history
      .slick-list
        .slick-track
          .slick-slide ×34
            .stone-wrapper
              .stone-contents
                .words
    #contact
      .contact-wrapper
        .contact-item ×4
  #footer
    .nav-wrapper
      .nav-item ×4
    .bottom
```

**总结**：该页面是一个企业展示官网，核心内容为企业使命、文化、历史和联系信息。主要删除项为背景装饰和轮播克隆节点，过滤后从 355.7KB 降至约 4.7KB。
