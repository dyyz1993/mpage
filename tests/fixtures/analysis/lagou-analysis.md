# lagou.yaml

## 原始结构

```
#PC: [t:3]
  .left: [div]
  .right: [t:1]
    #nocaptcha: [t:1]
      #nc_1_nocaptcha: [t:1]
        #nc_1_wrapper: [t:1]
          #nc_1_n1t: [t:1]
            #nc_1__bg: [h]
            #nc_1_n1z: [t:1]
            #nc_1__scale_text: [div]
  #_umfp: [h]

💡 Tip: h=hidden, b=button, l=link, t=text, ×N=array×N, KB→B=html→a11y
```

## LLM 分析

### 保留的关键结构

- `#PC` - 页面根容器
- `.right` - 右侧主内容区
- `#nocaptcha` - 验证码区域容器
- `#nc_1_nocaptcha` - 滑动验证组件根元素
- `#nc_1_wrapper` - 验证码包装器
- `#nc_1_n1t` - 验证码主容器
- `#nc_1__scale_text` - 验证码提示文本

### 建议删除的内容

| 选择器 | 删除原因 |
|--------|----------|
| `.left` | 空的左侧容器，无实际内容 |
| `#nc_1__bg` | 隐藏的背景元素，渲染后自动生成 |
| `#_umfp` | 隐藏的流量/指纹监控元素，非交互必需 |

### 不稳定的模式

| 模式 | 原因 |
|------|------|
| `#nc_1_*` | 滑动验证码的动态 ID 前缀，包含随机数字 "1" |
| `#_umfp` | 第三方安全插件的隐藏容器，版本不同 ID 可能变化 |

### 过滤后的结构树

```
#PC
└── .right
    └── #nocaptcha
        └── #nc_1_nocaptcha
            └── #nc_1_wrapper
                └── #nc_1_n1t
                    └── #nc_1__scale_text
```

**总结**：这是一个阿里云/腾讯滑动验证码页面，左侧容器为空，核心是右侧的 `#nocaptcha` 滑动验证组件。结构简单，无弹窗或临时元素。
