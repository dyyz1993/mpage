# Project Rules

## 1. 项目分工规则

### mpage — 浏览器自动化引擎（底层库）

- **定位**: npm 包 `@dyyz1993/xpage`，提供可编程的浏览器自动化能力
- **职责**: CDP 连接、录制/回放、页面结构提取、命令执行引擎
- **原则**: mpage 不关心 CLI 交互，不关心插件，不关心输出格式化
- **公共 API**: 通过 `src/index.ts` 统一导出，其他项目通过 `import` 使用

### xcli — 插件化 CLI 框架（上层工具）

- **定位**: 独立的 CLI 工具 `xcli`，依赖 mpage 的能力
- **职责**: 插件系统、Daemon 进程、HTTP/WebSocket API、命令路由、输出格式化
- **原则**: xcli 可以依赖 mpage，mpage 不能依赖 xcli

### 禁止事项

- mpage 的 `src/` 不得 import xcli 的任何模块
- 根目录不得放置临时脚本（debug-*.ts、test-*.cjs 等）
- 录制产物（.yaml/.json）放入 `recordings/` 目录或 .gitignore，不得提交
- 两个项目各自维护 eslint 配置，根配置 exclude xcli/

## 2. 代码规范

### ESLint 配置

- mpage 和 xcli 各自独立的 `.eslintrc.cjs`，均设 `root: true`
- 根 `.eslintrc.cjs` 的 `ignorePatterns` 必须包含 `xcli/`
- 统一规则:
  - `@typescript-eslint/no-explicit-any`: `warn`（逐步消除，新代码不允许新增 any）
  - `@typescript-eslint/no-unused-vars`: `error`，args 可用 `_` 前缀忽略
  - `no-empty`: `['error', { allowEmptyCatch: true }]`
  - `no-console`: `off`

### TypeScript

- `tsconfig.json` 必须启用 `strict: true`
- 禁止使用 `as any`，必须给出具体类型
- 导出类型: 公共 API 必须有 `.d.ts` 类型声明
- 文件命名: `kebab-case`（如 `plugin-loader.ts`）
- 类命名: `PascalCase`（如 `PluginLoader`）
- 导出: 优先 named export，避免 default export（插件入口除外）

### 代码组织

- 单文件不超过 300 行，超过必须拆分
- 每个 `src/` 子目录有 `index.ts` 统一导出
- 空目录必须删除，不留占位

### Prettier

- 统一配置: `semi: true, singleQuote: true, tabWidth: 2, printWidth: 100, trailingComma: es5`

## 3. Git 提交规范

### Commit Message 格式

```
<type>(<scope>): <description>
```

- **type**: `feat` | `fix` | `refactor` | `chore` | `docs` | `test` | `style`
- **scope**: `mpage` | `xcli` | `plugins` | `deps` | 可选
- **description**: 中文或英文，简短说明"为什么"而非"做了什么"

示例:
```
feat(xcli): use jiti to load TS plugins independently
fix(mpage): fix multi-tab recording missing events
chore: clean up debug scripts and recording files
```

### 禁止事项

- **禁止 `--no-verify`**: pre-commit hook 必须通过，通不过就修问题
- **禁止 force push**: 不得使用 `git push --force`
- **禁止 commit 敏感信息**: .env、credentials、token 不得提交

### 提交前必须通过

1. `npm run lint` — 0 errors（warnings 可接受）
2. `npm run typecheck` — 无类型错误
3. `npm run build` — 构建成功

## 4. 插件开发规范

### 插件目录结构

```
.xcli/plugins/<plugin-id>/
├── index.ts          # 插件入口（必须）
├── package.json      # 包配置（必须，至少含 name）
└── README.md         # 说明文档（推荐）
```

### 插件入口签名

```typescript
import type { XCLIAPI } from 'xcli';

export default function (xcli: XCLIAPI): void {
  const site = xcli.createSite({
    name: 'my-plugin',
    url: 'https://example.com',
  });

  site.command('scrape', {
    description: '采集数据',
    handler: async (params, ctx) => {
      return { data: [], tips: [] };
    },
  });
}
```

### TS 加载机制

- 插件 `.ts` 文件由 jiti 在运行时编译加载，无需预编译
- 插件可以使用完整的 TypeScript 特性（类型、泛型、装饰器等）
- 插件的 `node_modules` 依赖必须在插件 `package.json` 中声明

### 命名规范

- 插件目录名: `{序号}-{名称}`（如 `01-static`、`32-ecommerce`）或纯名称（如 `baidu`）
- 命令名: `kebab-case`（如 `scrape`、`reveal-phone`）
- 站点名: `kebab-case`，与目录名一致

### 插件隔离

- 每个插件通过 `createSite()` 注册，独立命名空间
- 插件之间不得直接 import，通过事件系统通信
- 插件的 `handler` 接收 `CommandContext`，不直接访问全局状态

### 插件加载顺序

1. `./.xcli/plugins/`（当前目录）
2. `../.xcli/plugins/`（父目录）
3. `~/.xcli/plugins/`（全局用户目录）

同名插件: 本地优先于全局，后加载覆盖先加载。
