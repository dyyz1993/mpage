# google.yaml

## 原始结构

```
#ZnpjSd: [div]
#ZnpjSd: [div]
.o3j99 n1xJcf Ne6nSd: [nav l:4 4.5KB→152B]
  #gb: [header l:4 3KB→113B]
    #gbwa: [l:1]
#LS8OJ: [t:1 2.2KB→15B]
  .k1zIA rSk4se: [2.1KB→15B]
.o3j99 ikrT4e om7nvf: [b:6 t:20 40.7KB→843B]
  #spch-dlg: [h b:1 t:3 7KB→14B]
    #spch: [h b:1 t:3 7KB→14B]
      #spchx: [h]
      #spchc: [h t:1 5.4KB]
        .inner-container: [h t:3 4.6KB]
          .button-container: [h 2KB]
            #spchl: [h]
            #spchb: [h t:1]
          #yZ04Ef: [h]
          .google-logo: [h 1.6KB]
        .permission-bar: [h]
          .permission-bar-gradient: [h]
  .SDkEP: [b:1 t:5 8.3KB→85B]
    .iblpc: [div]
    .a4bIc: [1.3KB→16B]
      .YacQv: [div]
      #APjFqb: [textarea]
    .fM33ce dRYYxd: [b:1 t:4 6.4KB→69B]
  .UUbT9 EyBRub: [h b:2 t:12 22.4KB→645B]
    #_yHK2acCfJZ6TwbkPtISL4Q0_1: [h]
      #_yHK2acCfJZ6TwbkPtISL4Q0_3: [h]
    .YB4h9 ky4hfd: [modal h t:2 1.1KB→83B]
      #_yHK2acCfJZ6TwbkPtISL4Q0_5: [h]
    #TWnylf: [h t:1 1.7KB→46B]
    #dh215c: [h]
  .FPdoLc lJ9FBc: [b:2]
.o3j99 qarstb: [×2]
  #_yHK2acCfJZ6TwbkPtISL4Q0_7: [div]
.KxwPGc SSwjIe: [t:10 8.3KB→379B]
  .KxwPGc AghGtd: [l:4 1.4KB→67B]
  .KxwPGc iTjxkf: [l:7 t:7 6.8KB→312B]
#lb: [h]
#sZmt3b: [div]
  #i58Mw: [div]
#snbc: [div]
#hfcr: [h]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- **`.o3j99 n1xJcf Ne6nSd`** - 主导航栏容器
  - **`#gb`** - Google 顶部工具栏
- **`.o3j99 ikrT4e om7nvf`** - 搜索功能核心区域
  - **`.SDkEP`** - 搜索表单
    - **`#APjFqb`** - 搜索输入框（textarea）- 核心交互元素
  - **`.FPdoLc lJ9FBc`** - 搜索按钮
- **`.KxwPGc SSwjIe`** - 底部链接区域

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `#spch-dlg`, `#spch` | 语音搜索弹窗（已隐藏，无用户交互时不可见） |
| `.permission-bar` | 语音权限提示栏（临时交互） |
| `.YB4h9 ky4hfd` | 模态弹窗（modal，已隐藏） |
| `#_yHK2acCfJZ6TwbkPtISL4Q0_*` | 临时 ID 的隐藏容器 |
| `#lb`, `#hfcr` | 空隐藏元素 |
| `#snbc` | 浏览器扩展注入或调试元素 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `#_yHK2acCfJZ6TwbkPtISL4Q0_*` | 动态生成的哈希 ID，每次刷新变化 |
| `.o3j99*` | Google 内部 CSS 类名，非标准命名 |
| `#sZmt3b`, `#i58Mw` | 随机生成的无意义 ID |

### 过滤后的结构树

```
body
├── nav.o3j99 (Google 导航栏)
│   └── header#gb
│       └── a#gbwa (Logo)
├── main.o3j99
│   ├── form.SDkEP (搜索表单)
│   │   └── textarea#APjFqb
│   └── div.FPdoLc (搜索按钮)
└── footer.KxwPGc
    └── div.KxwPGc (底部链接)
```
