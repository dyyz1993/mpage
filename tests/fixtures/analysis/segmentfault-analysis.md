# segmentfault.yaml

## 原始结构

```
#__next: [i:1 b:7 t:357 88.8KB→10.9KB]
  .d-none d-lg-block text-center: [div]
    #OA_holder_5: [h]
  #root-top-container: [div]
  #sf-header: [nav item i:1 b:3 t:26 11.4KB→982B]
    .me-2 navbar-toggler collapsed: [button]
      .navbar-toggler-icon: [h]
  .d-flex: [b:4 t:199 77.3KB→9.9KB]
    .flex-column nav nav-pills: [l:6 ×6]
      .nav-link: [t:1]
    .flex-column nav nav-pills: [l:3 ×3]
    .accordion accordion-flush: [b:1 t:20 5.2KB→444B]
      .flex-column nav nav-pills: [b:1 5.2KB→444B]
        .w-100 nav-item: [b:1 t:20 5.1KB→444B]
          .accordion-collapse collapse: [×19 4.9KB→421B]
            .w-100 nav-item: [l:1 t:1]
    .flex-fill mw-100: [b:3 t:332 69KB→9.2KB]
      #footer: [t:10 4.7KB→723B]
        .row: [t:6 ×6 3.8KB→510B]
          .col-md-2 col-4: [list l:4 t:4]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构
- `#sf-header` - 网站主导航栏
- `.d-flex` - 主布局容器
- `.flex-fill` - 主内容区域
- `#footer` - 页脚区域
- `.accordion` - 手风琴式侧边导航
- `.nav.nav-pills` - 标签式导航

### 建议删除的内容
| 选择器 | 删除原因 |
|--------|----------|
| `#OA_holder_5` | 空隐藏容器（只有 h 标记无实际内容） |
| `.d-none.d-lg-block` | 临时公告占位区域 |

### 不稳定的模式
| 模式 | 原因 |
|------|------|
| `#__next` | Next.js 框架根元素，版本升级会变化 |
| `sf-header` | 特定框架的哈希标记命名 |

### 过滤后的结构树
```
sf-header (nav)
  └─ navbar-toggler (button) - 移动端折叠按钮
main.d-flex
  ├─ .nav.nav-pills (×6 links)
  ├─ .nav.nav-pills (×3 links)
  ├─ .accordion
  │   └─ .nav.nav-pills (×19 items)
  └─ .flex-fill
      └─ #footer
          └─ .row (×6 columns)
```
