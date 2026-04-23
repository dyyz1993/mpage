# xcli 实现任务

## 阶段 1: 核心重构

- [x] 规格文档 (spec.md)
- [ ] 重构 xcli.ts 主入口
- [ ] 更新 arg-parser.ts 支持扁平化命令
- [ ] 更新 RPC 协议匹配新命令

## 阶段 2: 会话管理命令

- [ ] `open` - 打开 URL
- [ ] `close` - 关闭浏览器
- [ ] `kill` - 强制杀死

## 阶段 3: 页面交互命令

- [ ] `snapshot` - 获取页面快照
- [ ] `click` - 点击元素
- [ ] `fill` - 填写表单
- [ ] `type` - 输入文本
- [ ] `select` - 选择下拉
- [ ] `check` - 勾选
- [ ] `press` - 按键
- [ ] `scroll` - 滚动

## 阶段 4: 信息获取命令

- [ ] `get` - 获取信息
- [ ] `html` - 获取 HTML
- [ ] `screenshot` - 截图
- [ ] `pdf` - 导出 PDF

## 阶段 5: 存储命令

- [ ] `cookies` - Cookie 操作
- [ ] `localStorage` - LocalStorage 操作

## 阶段 6: 其他命令

- [ ] `wait` - 等待
- [ ] `network` - 网络监控
- [ ] `viewer` - 实时查看
- [ ] `daemon` - Daemon 管理

## 阶段 7: 测试

- [ ] 手动测试所有命令
- [ ] 修复 lint 错误
- [ ] 提交代码
