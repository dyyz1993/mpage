# zhipin.yaml

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
- `#PC` - 验证码主容器
- `.right` - 验证码交互区域
- `#nocaptcha` / `#nc_1_nocaptcha` - 验证码组件根元素
- `#nc_1_wrapper` - 验证码包装容器
- `#nc_1__scale_text` - 验证码提示文字

### 建议删除的内容
| 选择器 | 删除原因 |
|--------|----------|
| `.left` | 空白占位容器，无实际内容 |
| `#nc_1__bg` [h] | 隐藏的背景元素，CSS背景图 |
| `#nc_1_n1z` [h] | 隐藏的辅助元素，不参与交互 |
| `#_umfp` [h] | 阿里云内部统计脚本标记，用户无需可见 |

### 不稳定的模式
| 模式 | 原因 |
|------|------|
| `#nc_1_*` | 阿里云验证码动态生成的实例ID，刷新后可能变化 |

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

**总结**：这是一个完整的阿里云滑动验证码组件，核心是 `.right` 区域下的验证码交互区。`.left` 为空白容器可删除，`#_umfp` 为统计标记无用户价值。依赖时建议使用稳定的 class 选择器而非动态 ID。
