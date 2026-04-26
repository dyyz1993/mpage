---
description: Git 提交约束
---

# Git 提交约束

- 禁止使用 --no-verify，hook 通不过就修问题
- commit message 格式: <type>(<scope>): <description>
  - type: feat | fix | refactor | chore | docs | test | style
  - scope: mpage | xcli | plugins | deps
  - description 简短说明"为什么"而非"做了什么"
- 提交前必须通过: npm run lint (0 errors) + npm run typecheck + npm run build
- 禁止提交敏感信息（.env、credentials、token）
