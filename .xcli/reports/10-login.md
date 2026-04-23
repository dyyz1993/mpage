# 10-login

## 插件信息

- **名称**: 10-login
- **URL**: https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/10-login.html
- **描述**: 登录凭证采集插件

## 命令

### login

登录获取凭证

```bash
xcli 10-login login --username admin --password password
```

**参数**:
- `username` (string, optional): 用户名，默认 "admin"
- `password` (string, optional): 密码，默认 "password"

### verify

校验登录凭证

```bash
xcli 10-login verify --username admin --password password
```

**参数**:
- `username` (string, optional): 用户名，默认 "admin"
- `password` (string, optional): 密码，默认 "password"

## 验证结果

### login

```
$ xcli 10-login login --username admin --password password
✓ 登录成功
  Token: YWRtaW46MTc3NjkwNDk1...
data:
  - success: true
    token: YWRtaW46MTc3NjkwNDk1MTY3MTo3MGJiNzc0Y2QwZmE5N2UwYmE5YzQ4ZDM5OGU3ODQ4MjVhMzI5MzU5YTEyNTRkOTZiODExMTgwNDQzMjZhODlj
    message: 登录成功
💡 登录成功
```

### verify

```
$ xcli 10-login verify --username admin --password password
data:
  - success: true
    token: YWRtaW46MTc3NjkwNDk2Nzk0Mzo4ZDk1Nzk3NTQ4ZmYzZmY1NTlkOGJhODEzMzVjOTJmOTQxNTc0MTFiMGEwMzhjMGE4YTJhYWE1ZGI2YTg3YjVl
    message: 登录成功
errors: []
💡 校验通过
```

## 校验标准检查

- [x] 请求格式: POST + application/json
- [x] 请求体包含 username 和 password
- [x] 认证信息: username="admin", password="password"
- [x] 响应状态: success = true
- [x] token: 非空字符串，有效值
- [x] 校验通过