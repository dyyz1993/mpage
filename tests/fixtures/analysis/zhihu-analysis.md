# zhihu.yaml

## 原始结构

```
#root: [i:2 b:11 t:9 13.4KB→1.1KB]
  .LoadingBar css-55n9hh: [div]
  .App-main: [i:2 b:10 t:9 12.5KB→1KB]
    .SignFlowHomepage-content: [i:2 b:10 l:3 t:7 9.5KB→449B]
      .signQr-container: [i:2 b:10 l:3 t:9 9.3KB→433B]
        .signQr-leftContainer: [b:2 t:3 1.1KB→115B]
          .Qrcode-container smallVersion: [div]
            .Qrcode-content: [t:1]
              .Qrcode-img: [div]
              .Qrcode-guide-message: [div]
        .signQr-rightContainer: [i:2 b:8 l:3 t:4 8.2KB→318B]
          .SignContainer-content: [i:2 b:5 l:1 t:3 4.3KB→209B]
            .SignContainer-inner: [i:2 b:5 l:1 t:4 ×2 4.2KB→209B]
              .SignFlow Login-content: [form i:2 b:5 l:1 t:4 3.9KB→203B]
                .SignFlow-tabs: [l:1]
                  .SignFlow-tab: [t:1]
                .SignFlow-account: [i:1 b:1 t:1 ×2 1.7KB→43B]
                  .Popover ddLajxN_Q0AuobBZjX9m: [b:1 t:1]
                    #Popover2-toggle: [button]
                .Login-options: [b:2 t:1]
          .Login-socialLogin: [b:3 3.3KB→27B]
            .Login-socialButtonGroup: [b:3 3.2KB→27B]
          .SignContainer-tip: [l:2 t:1]
    .SignFlowHomepage-footer: [t:24 2.8KB→601B]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构
- `form.SignFlow.Login-content` - 登录表单主容器
- `.SignFlow-account` - 账号输入区域（含 ×2 输入框）
- `.Login-options` - 登录选项区域
- `.Login-socialLogin` - 社交登录区域
- `.SignFlowHomepage-footer` - 页脚
- `button#Popover2-toggle` - 下拉选择按钮

### 建议删除的内容
| 选择器 | 删除原因 |
|--------|----------|
| `.LoadingBar` | 加载状态指示器，已完成加载后无意义 |
| `.signQr-container` | 二维码登录容器，如不需要扫码登录 |
| `.signQr-leftContainer` | 二维码左侧区域，包含 QR 码和引导文字 |
| `.Login-socialButtonGroup` | 社交登录按钮组（Google/Apple 等），如不需要第三方登录 |
| `.SignContainer-tip` | 提示信息，纯文本说明 |
| `div.Qrcode-content` | 二维码内容容器 |

### 不稳定的模式
| 模式 | 原因 |
|------|------|
| `ddLajxN_Q0AuobBZjX9m` | Popover 动态类名，版本更新后会变化 |
| `.Login-options` 中的 `b:2` | 按钮数量可能变化，不应依赖精确计数 |

### 过滤后的结构树
```
#root
└── .App-main
    └── .SignFlowHomepage-content
        └── .signQr-rightContainer (删除左侧二维码)
            └── .SignContainer-content
                └── form.SignFlow.Login-content
                    ├── .SignFlow-tabs
                    ├── .SignFlow-account ×2
                    ├── .Login-options
                    └── .Login-socialLogin (可选)
```
