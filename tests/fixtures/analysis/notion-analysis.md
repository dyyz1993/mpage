# notion.yaml

## 原始结构

```
#__next: [i:13 b:20 t:137 270.4KB→11.1KB]
  .blue_theme__VG1s8: [h i:13 b:20 t:142 270KB→11.1KB]
    .homepage_section___Tv7x: [b:10 t:20 ×2 37.8KB→2.8KB]
      .bentoCarousel_root__P6Gn8: [b:10 l:1 t:1 8.3KB→824B]
        .bentoHeader_header__vF0Xh: [l:1 t:1]
      .bentos_bentoSection__5jULI: [l:3 t:7 9.8KB→755B]
        .bentos_bentoGrid__LBfZl: [l:3 t:3 ×3 9.5KB→712B]
          .bento_bentoInner__luLfd: [l:1 t:1 3.7KB→291B]
            .bento_bentoHeader__v_SR2: [t:2 ×2]
      .bentos_bentoSection__5jULI: [l:3 t:7 7.9KB→626B]
        .bentos_bentoGrid__LBfZl: [l:3 t:3 ×3 7.5KB→584B]
          .bento_bentoInner__luLfd: [l:1 t:1 2.7KB→201B]
            .bento_bentoHeader__v_SR2: [t:2 ×2]
    .homepage_main__sRG4_: [i:13 l:1 t:7 7.2KB→919B]
      .sectionHeaderV2_ctas__HkHjI: [l:1 t:2]
    .homepage_section___Tv7x: [b:2 l:7 t:2 24.3KB→1.5KB]
    .homepage_main__sRG4_: [l:4 t:3 11.7KB→580B]
      .homepage_section___Tv7x: [l:4 t:10 11.7KB→580B]
    .base_theme__FJXCL: [h b:2 t:35 45KB→2.2KB]
      .footer_footerInner__MQQSo: [nav b:2 t:35 44.8KB→2.2KB]
        .footer_footerTop__rz2e9: [b:2 t:2 27.9KB→1.2KB]
          .footer_logo__ssDpx: [4.2KB→23B]
          .footer_footerTopMain__2yt5M: [b:2 t:33 23.7KB→1.2KB]
            .footer_addendum__i1N2u: [b:2 t:2 18.6KB→1KB]
              .Spacer_spacer__Hz1_q: [div]
              .footer_button__vbjiT: [button]
              .Spacer_spacer__Hz1_q: [div]
        .footer_footerBottom__sYaND: [t:25 16.8KB→981B]
          .footer_footerColumns__T50DJ: [t:2 ×4 16.7KB→981B]
            .footerColumn_list__xEsxo: [l:6 t:7 ×7 4.6KB→262B]
    .snackBar_snackBar__IYfOp: [div]
#portal: [div]
#podscribe-request: [h]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构
- `#__next` - 应用根容器
- `.homepage_section___Tv7x` - 首页内容区块（×3）
- `.bentoCarousel_root__P6Gn8` - 轮播组件
- `.bentos_bentoGrid__LBfZl` - Bento 网格布局（×3）
- `.homepage_main__sRG4_` - 主要内容区域
- `.footer_footerInner__MQQSo` - 页脚容器
- `.footer_footerColumns__T50DJ` - 页脚导航列（×4）

### 建议删除的内容
| 选择器 | 删除原因 |
|--------|----------|
| `.snackBar_snackBar__IYfOp` | 临时消息通知条 |
| `#portal` | 空 Portal 根元素 |
| `#podscribe-request` | 隐藏的辅助元素 |
| `.Spacer_spacer__Hz1_q` | 纯布局间距元素 |
| `.footer_addendum__i1N2u` | 页脚附加说明区（冗余） |
| `.footer_button__vbjiT` | 页脚按钮（低优先级） |

### 不稳定的模式
| 模式 | 原因 |
|------|------|
| `__VG1s8`, `__P6Gn8`, `__5jULI` | CSS Module 哈希值，每次构建变化 |
| `.blue_theme__`, `.base_theme__` | 主题类名前缀 |
| `#__next` | Next.js 框架容器 |

### 过滤后的结构树
```
#__next
├── .blue_theme__VG1s8
│   ├── .homepage_section___Tv7x (轮播区)
│   │   └── .bentoCarousel_root__P6Gn8
│   ├── .homepage_section___Tv7x (Bento 区块)
│   │   └── .bentos_bentoGrid__LBfZl (×3)
│   ├── .homepage_main__sRG4_ (主内容)
│   └── .homepage_section___Tv7x (更多内容)
└── .base_theme__FJXCL (页脚)
    └── .footer_footerInner__MQQSo
        ├── .footer_footerTop__rz2e9
        │   ├── .footer_logo__ssDpx
        │   └── .footer_footerTopMain__2yt5M
        └── .footer_footerBottom__sYaND
            └── .footer_footerColumns__T50DJ (×4)
```
