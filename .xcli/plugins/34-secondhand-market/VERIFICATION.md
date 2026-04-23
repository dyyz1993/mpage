# 34-二手交易平台 插件验证

## 测试日期
2024-01-20

## 测试命令
```bash
xcli run 34-secondhand-market --args reveal-phone
```

## 验证结果

### 1. 第一条商品信息
```json
{
  "id": "ITEM00100001",
  "title": "iPhone 15 Pro Max 256GB 深空黑色",
  "price": 1057,
  "description": "个人闲置，99新，箱说全，可小刀，顺丰包邮",
  "location": "北京朝阳",
  "sellerName": "小明闲置"
}
```

### 2. 商品总数
- **48 条商品**
- 分 5 页，每页 10 条

### 3. 随机商品完整信息（含电话）
```json
{
  "id": "ITEM00100005",
  "title": "Sony WH-1000XM5 头戴式降噪耳机",
  "description": "个人闲置，99新，箱说全，可小刀，顺丰包邮",
  "price": 11993,
  "image": "🎧",
  "location": "杭州余杭",
  "sellerName": "正品保证",
  "phone": "13800100005"
}
```

### 4. 发布商品
- 限流保护：60秒内只能发布1次
- 测试时触发限流，需要等待冷却

## 验证标准

| 标准 | 结果 |
|------|------|
| 商品 ID 格式正确 | ✅ ITEM00100001-ITEM00100048 |
| 价格数据准确 | ✅ 数字类型 |
| 电话号码格式正确 | ✅ 11位手机号 13800100005 |
| 图片信息完整 | ✅ emoji 表情符号 |

## API 端点

- `POST /examples/34/login` - 登录
- `GET /examples/34/items?page=N` - 商品列表
- `POST /examples/34/reveal-phone` - 查看电话
- `POST /examples/34/publish` - 发布商品

## 插件参数

- `--args reveal-phone` - 获取前5个商品的电话
- `--args publish` - 发布商品
- `--username <user>` - 用户名（默认 admin）
- `--password <pass>` - 密码（默认 password）
- `--title <title>` - 商品标题
- `--description <desc>` - 商品描述
- `--price <price>` - 商品价格