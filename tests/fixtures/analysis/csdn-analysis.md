# csdn.yaml

## 原始结构

```
#csdn-toolbar: [i:2 b:1 l:6 t:9 5.7KB→349B]
  .toolbar-inside exp3: [i:2 b:1 l:6 t:5 5.7KB→349B]
    .toolbar-container-left: [l:1 ×2]
      .toolbar-mini-meuns: [div]
        .toolbar-mini-meuns-icon: [div]
    .toolbar-container-mini-middle: [i:2 b:1 t:2]
      .toolbar-search-container: [i:2 b:1 t:2]
        #toolbar-search-input: [input]
        #toolbar-search-button: [button]
        #toolbar-c-box-button: [p]
    .toolbar-container-right: [l:5 t:3 4.1KB→261B]
      .toolbar-btns onlyUser: [l:5 t:9 ×5 4KB→261B]
        #csdn-toolbar-profile-nologin: [h l:1 t:5 1.6KB→170B]
          .csdn-toolbar-plugin-triangle: [h]
          .csdn-toolbar-profile-title: [h t:1]
          .csdn-profile-top: [list h]
          .csdn-toolbar-by-box: [h l:1 t:1]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构
- `#toolbar-search-input` - 搜索输入框
- `#toolbar-search-button` - 搜索按钮
- `#csdn-toolbar-profile-nologin` - 用户登录/注册入口

### 建议删除的内容
| 选择器 | 删除原因 |
|--------|----------|
| `.toolbar-mini-meuns` | 空的小菜单容器，无实际功能 |
| `.csdn-toolbar-plugin-triangle` | 纯装饰性三角箭头 |
| `.csdn-profile-top` | 列表项，无内容 |
| `.csdn-toolbar-by-box` | 底部工具盒，无实际作用 |

### 不稳定的模式
| 模式 | 原因 |
|------|------|
| `.toolbar-*` | CSDN 内部工具栏前缀，可能随版本变化 |
| `#csdn-toolbar-*` | 命名空间前缀不稳定 |
| `exp3` | 可能是实验性功能的临时标记 |

### 过滤后的结构树
```
#csdn-toolbar
  #toolbar-search-input
  #toolbar-search-button
  #csdn-toolbar-profile-nologin
    .csdn-toolbar-profile-title
```
