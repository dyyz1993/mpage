# taobao.yaml

## 原始结构

```
#J_SiteNav: [login t:61 12.3KB→1.5KB]
  #J_SiteNavBd: [t:22 12.2KB→1.5KB]
    #J_SiteNavBdL: [l:8 t:25 ×5 7.3KB→898B]
      .site-nav-menu-hd: [t:1]
        .site-nav-region: [t:1]
        .site-nav-arrow: [span]
          .site-nav-icon: [t:1]
      #J_SiteNavRegionList: [×16 1.2KB→251B]
    #J_SiteNavBdR: [t:36 4.8KB→641B]
      #J_SiteNavHome: [menu h l:1]
        .site-nav-menu-hd: [h l:1 t:1]
          .site-nav-new-home: [h l:1]
      #J_SiteNavBought: [menu l:1]
        .site-nav-menu-hd: [l:1 t:1]
      #J_SiteNavMytaobao: [menu l:3]
        .site-nav-menu-hd: [l:1 t:2]
          .site-nav-arrow: [span]
            .site-nav-icon: [t:1]
      #J_MiniCart: [nav menu l:1]
        .site-nav-menu-hd: [l:1 t:3]
        .site-nav-menu-bd: [div]
      #J_SiteNavFavor: [menu l:3]
        .site-nav-menu-hd: [l:1 t:3]
          .site-nav-arrow: [span]
            .site-nav-icon: [t:1]
      #J_SiteNavOpenShop: [menu l:4]
        .site-nav-menu-hd: [l:1 t:2]
          .site-nav-arrow: [span]
            .site-nav-icon: [t:1]
      #J_SiteNavSeller: [menu l:8]
        .site-nav-menu-hd: [l:1 t:2]
          .site-nav-arrow: [span]
            .site-nav-icon: [t:1]
      #J_SiteNavService: [menu l:7]
        .site-nav-menu-hd: [l:1 t:2]
          .site-nav-arrow: [span]
            .site-nav-icon: [t:1]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `#J_SiteNav` - 顶部导航栏根容器
- `#J_SiteNavBdR` - 右侧导航区域（核心功能区）
- `#J_SiteNavHome` - 首页链接
- `#J_SiteNavMytaobao` - 我的淘宝（用户核心入口）
- `#J_MiniCart` - 购物车（重要交互元素）
- `#J_SiteNavFavor` - 我的收藏
- `#J_SiteNavSeller` - 卖家中心
- `#J_SiteNavService` - 消费者服务中心

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `#J_SiteNavRegionList` | 16个地区选项，文本量大，对可访问性贡献低 |
| `.site-nav-arrow` | 纯装饰性箭头图标，无实际功能 |
| `.site-nav-icon` | 图标元素，无文本替代 |
| `.site-nav-new-home` | 隐藏元素，内容为空 |
| `#J_SiteNavBought` | 购买过的店铺，低频功能 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `site-nav-arrow` | 下拉箭头图标，发布版本可能替换 |
| `site-nav-icon` | 各类图标，内部可能使用字体图标或 SVG |
| `site-nav-menu-bd` | 下拉面板容器，内容动态加载 |

### 过滤后的结构树

```
#J_SiteNav
└── #J_SiteNavBd
    ├── #J_SiteNavBdR
    │   ├── #J_SiteNavHome [l:1]
    │   ├── #J_SiteNavMytaobao [l:3]
    │   ├── #J_MiniCart [l:1]
    │   ├── #J_SiteNavFavor [l:3]
    │   ├── #J_SiteNavOpenShop [l:4]
    │   ├── #J_SiteNavSeller [l:8]
    │   └── #J_SiteNavService [l:7]
```
