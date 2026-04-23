# trello.yaml

## 原始结构

```
#BXP-APP: [i:2 b:32 t:165 129.6KB→10.4KB]
  #skip-to-content: [t:1]
  [data-testid="bignav"]: [header b:4 t:17 37.3KB→2.9KB]
    [data-testid="logo_link"]: [3.3KB→32B]
    [data-testid="bignav-tab"]: [t:1]
    [data-testid="bignav-tab"]: [t:1]
    [data-testid="bignav-tab"]: [t:1]
    [data-testid="bignav-tab"]: [t:1]
  [data-testid="smallnav"]: [header b:6 t:21 ×2 36.9KB→2.8KB]
    [data-testid="logo_link"]: [3.3KB→32B]
    [data-testid="menubutton"]: [nav]
  #skip-target: [main i:2 b:22 t:33 38.7KB→3.6KB]
    .grid__Row-sc-p40pqe-1 xFbia: [div]
    [data-testid="list-carousel"]: [b:12 t:12 ×3 12.4KB→768B]
      .Stack-sc-98g4c-0 gQBPsj: [b:3]
    [data-testid="block"]: [l:1 t:3]
      .Stack-sc-98g4c-0 dBwIbP: [l:1 ×2]
  .grid__Row-sc-p40pqe-1 xFbia: [l:5 t:8 ×2 7.6KB→398B]
    [data-testid="login"]: [a]
  .grid__Row-sc-p40pqe-1 esQJBv: [l:8 t:21 ×3 8.6KB→673B]
    [data-testid="language-select"]: [1.3KB→408B]
.grecaptcha-badge: [1.1KB→37B]
  .grecaptcha-logo: [div]
  .grecaptcha-error: [div]
  #g-recaptcha-response-100000: [h]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构
- `#BXP-APP` - 主应用容器
- `[data-testid="bignav"]` - 顶部导航
- `[data-testid="smallnav"]` - 移动端导航
- `[data-testid="menubutton"]` - 移动端菜单按钮
- `#skip-target` - 主内容区域
- `[data-testid="list-carousel"]` - 轮播组件
- `[data-testid="block"]` - 内容块

### 建议删除的内容
| 选择器 | 删除原因 |
|--------|----------|
| `.grecaptcha-badge` | Google reCAPTCHA 验证组件，非用户内容 |
| `.grecaptcha-logo` | reCAPTCHA 图标，无实际内容 |
| `.grecaptcha-error` | reCAPTCHA 错误信息占位 |
| `#g-recaptcha-response-100000` | 隐藏的验证码响应字段 |

### 不稳定的模式
| 模式 | 原因 |
|------|------|
| `.grid__Row-sc-p40pqe-1 xFbia` | CSS Modules 哈希类名，构建时变化 |
| `.grid__Row-sc-p40pqe-1 esQJBv` | 同上 |
| `.Stack-sc-98g4c-0 gQBPsj` | 同上 |
| `.Stack-sc-98g4c-0 dBwIbP` | 同上 |

### 过滤后的结构树
```
#BXP-APP
  #skip-to-content (a)
  [data-testid="bignav"]
    [data-testid="logo_link"]
    [data-testid="bignav-tab"] ×4
  [data-testid="smallnav"]
    [data-testid="logo_link"]
    [data-testid="menubutton"]
  #skip-target (main)
    [data-testid="list-carousel"] ×3
    [data-testid="block"]
  [data-testid="login"]
  [data-testid="language-select"]
```

**分析说明**：
- 该页面压缩率很高（主区域 38.7KB→3.6KB），说明大部分是 JS 动态渲染
- 轮播组件 `[data-testid="list-carousel"]` 是页面的核心展示单元，应重点提取
- 依赖 `data-testid` 属性识别元素比依赖哈希类名更稳定
- 登录和语言选择可能影响后续交互决策
