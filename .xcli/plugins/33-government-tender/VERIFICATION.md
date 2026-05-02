# 33. 政府招标网 - 手动验证文档

## 案例 URL
https://tools.docker.19930810.xyz:8443/tools/crawler-practice/examples/33-government-tender.html

## 描述
模拟政府采购网。滑块验证登录后搜索招标公告，部分内容需要登录才能查看。

## 难度
⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ 专家

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
1. 运行命令: `xcli 33-government-tender scrape`
2. 检查输出是否符合预期
3. 运行命令: `xcli 33-government-tender verify`
4. 确认验证通过

## 已知问题
- 无

## 改进建议
- 无

## 技术要点
<!-- 记录实现过程中用到的技术要点和难点 -->
