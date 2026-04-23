# infoq.yaml

## 原始结构

```
#__nuxt: [i:1 t:316 150.3KB→18.6KB]
  .app: [i:1 t:291 150.2KB→18.6KB]
    #main-container: [header i:1 l:8 t:29 5.6KB→712B]
      .logo header-logo: [l:1]
      .nav-search-wrap: [i:1 l:7 3.4KB→256B]
        .web-menu-list is-ready: [l:7 ×8 3KB→235B]
        .search-container: [i:1 t:1]
          .search-wrap: [i:1]
            .search-input: [input]
            .search iconfont: [t:1]
      .write-btn-warp: [t:2]
        .scene: [h t:7]
          .close: [h]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `#main-container` - 主容器（header 区域）
- `.logo` / `.header-logo` - Logo 标识
- `.web-menu-list` - 导航菜单列表
- `.search-container` / `.search-input` - 搜索功能
- `.write-btn-warp` - 写作/发帖按钮

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.__nuxt` | 框架内部根元素，无实际功能 |
| `.scene` | 隐藏的临时弹窗/场景容器（h 标记） |
| `.close` | 属于隐藏 `.scene` 的关闭按钮 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `#__nuxt` | Nuxt.js 内部实现标识符 |
| `.is-ready` | 动态状态类，发布后可能变化 |

### 过滤后的结构树

```
#main-container
  .logo
  .nav-search-wrap
    .web-menu-list
    .search-container
      .search-input
  .write-btn-warp
```

**核心说明**：该页面是一个简单的博客/内容平台头部区域，包含 Logo、导航菜单、搜索框和写作入口按钮。隐藏的 `.scene` 是临时弹窗，建议删除。
