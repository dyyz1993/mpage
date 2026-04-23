# 35-知识问答社区 插件验证

## 测试日期
2024-01-20

## 测试命令

```bash
# 获取验证码
xcli 35-qa-community captcha

# 登录（需要先获取验证码）
xcli 35-qa-community login --captchaId <id> --positions "0,1,2"

# 获取问题列表
xcli 35-qa-community questions

# 采集所有问题
xcli 35-qa-community scrape

# 投票
xcli 35-qa-community vote --questionId Q00100001
```

## 验证结果

### 1. 第一条问题信息
```json
{
  "id": "Q00100001",
  "title": "Python爬虫如何处理验证码？",
  "tags": ["#爬虫", "#Python"],
  "votes": 186,
  "answers": 23,
  "favorites": 57
}
```

### 2. 问题总数
- **50 条问题**

### 3. 验证码
```json
{
  "captchaId": "click-1776976546297",
  "targetChars": ["问", "答", "学"],
  "charPositions": [
    { "char": "问", "x": 135, "y": 70 },
    { "char": "答", "x": 216, "y": 44 },
    { "char": "学", "x": 51, "y": 72 }
  ]
}
```

### 4. 登录
```json
{
  "success": true,
  "token": "YWRtaW46MTc3Njk3NjU1..."
}
```

### 5. 投票
```json
{
  "success": true,
  "votes": 234
}
```

## 验证标准

| 标准 | 结果 |
|------|------|
| 问题 ID 格式正确 | ✅ Q00100001-Q00100050 |
| 标题数据准确 | ✅ 字符串 |
| 标签数组完整 | ✅ ["#爬虫", "#Python"] |
| 投票数是数字 | ✅ 186 |
| 回答数是数字 | ✅ 23 |

## API 端点

- `GET /examples/35/click-captcha` - 点选验证码
- `POST /examples/35/login` - 登录
- `GET /examples/35/questions?page=N` - 问题列表
- `POST /examples/35/vote` - 投票

## 核心练习点

- **Shadow DOM** - user 命令使用 `shadowRoot` 提取
- **点选验证码** - captcha 命令获取，login 需要 positions
- **虚拟滚动** - scrape 命令遍历全部分页
- **用户交互** - vote 命令需要登录