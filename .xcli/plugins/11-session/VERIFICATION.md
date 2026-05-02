# 11. Session/Cookie保持 - 手动验证文档

## 案例 URL
https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/11-session.html

## 描述
登录后访问受限页面。携带Cookie访问并维持会话状态。

## 难度
⭐⭐⭐⭐⭐ 中等

## 需要登录
是

## 验证目标
- 目标1：描述
- 目标2：描述

## 预期结果
```json
{
  "data": [
    {
      "title": "示例数据"
    }
  ],
  "tips": ["采集成功"]
}
```

## 验证步骤
1. 运行命令: `xcli 11-session scrape`
2. 检查输出是否符合预期
3. 运行命令: `xcli 11-session verify`
4. 确认验证通过

## 已知问题
- 无

## 改进建议
- 无

## 技术要点
<!-- 记录实现过程中用到的技术要点和难点 -->
