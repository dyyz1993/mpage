# Project Rules

## 1. 项目分工规则

### @dyyz1993/xcli-core — 通用抽象层

- **定位**: 通用 npm 包，提供 CLI 工具的底层抽象，不绑定任何业务领域
- **职责**: 会话管理（SessionStore、SessionManager）、持久化适配器、生命周期钩子、通用基础设施
- **原则**: 纯抽象，不关心浏览器、不关心 CLI 交互、不关心具体业务逻辑
- **公共 API**: 通过 `src/index.ts` 统一导出，任何 CLI 工具都可通过 `import` 使用

### mpage — 浏览器自动化能力包

- **定位**: 基于 Playwright/CDP 的浏览器自动化能力包
- **核心模块**:
  - `@dyyz1993/xpage` — 浏览器自动化核心（Playwright/CDP）
  - `xcli-browser` — 浏览器内置命令（cookie、localStorage、录制等）
- **原则**: 依赖 xcli-core 的抽象，但不关心 CLI 路由和输出格式化
- **公共 API**: 通过各包的 `src/index.ts` 统一导出

### xbrowser — 浏览器自动化 CLI（上层工具）

- **定位**: 独立的 CLI 工具 `xbrowser`，面向终端用户的浏览器自动化入口
- **职责**: CLI 路由、插件系统、Daemon 进程、会话管理、命令分发
- **依赖关系**: 依赖 mpage 的 core 和 browser 包
- **会话管理**: `BrowserSessionManager` 继承 core 的 `SessionManager<BrowserSessionInfo>`

### 项目间依赖方向

```
xbrowser → xcli-core (SessionManager, SessionStore, SessionPersistence, SessionLifecycle)
xbrowser → mpage/xcli-browser (浏览器内置命令)
mpage → xcli-core (会话管理抽象)
xcli-core ← 不依赖任何业务项目，纯通用抽象
```

### 禁止事项

- xcli-core 不得 import 任何业务项目的模块（xbrowser、xcli 等）
- mpage 的 `src/` 不得 import xbrowser 或 xcli 的任何模块
- 根目录不得放置临时脚本（debug-*.ts、test-*.cjs 等）
- 录制产物（.yaml/.json）放入 `recordings/` 目录或 .gitignore，不得提交
- 各项目各自维护 eslint 配置，根配置 exclude xbrowser/

### 会话架构

xcli-core 提供会话管理的分层抽象（不绑定任何业务领域）：

| 层级 | 类 | 职责 |
|------|-----|------|
| 数据层 | `SessionStore<TMeta>` | 纯 Map 包装器，CRUD 操作 |
| 行为层 | `SessionManager<TMeta>` | 生命周期管理、持久化、恢复模板方法 |
| 持久化 | `SessionPersistence<TMeta>` | 适配器接口 + `FileSessionPersistence` JSON 实现 |
| 生命周期 | `SessionLifecycle<TMeta>` | 钩子接口（onCreate/onClose/onRestore） |

上层项目继承 `SessionManager`，覆写 `allocateSession` 和 `restoreSession` 实现特有逻辑。

**会话创建方式**: 隐式创建，不提供显式 `session open` 命令。通过 `--session <name>` 全局选项，首次使用时自动创建。

## 2. 代码规范

### ESLint 配置

- 各项目各自独立的 eslint 配置，均设 `root: true`
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
- **scope**: `core` | `xbrowser` | `xcli` | `plugins` | `deps` | 可选
- **description**: 中文或英文，简短说明"为什么"而非"做了什么"

示例:
```
feat(core): add SessionManager with persistence and lifecycle hooks
fix(xbrowser): remove session open command, auto-create via --session
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

## 5. Rules 编写规范

### 何时需要编写 Rule

- 用户反复纠正同一个行为（"我之前说过"、"又来了"）
- 用户给出明确指令（"永远这样做"、"禁止那样做"、"记住..."）
- 发现已有的 lint/prettier 配置无法覆盖的约定
- 需要跨会话持久化的偏好

### Rule 存放位置

- `.trae/rules/` — 项目/团队约定（仓库内）

### Rule 基本格式

```md
# Rule Title

- 具体的、可执行的指令
- 避免"一般性最佳实践"，只写项目特有的约定
```

### 注意事项

- 一个 rule 只表达一个概念，不要堆叠 6+ 个维度
- 写 rule 前先检查是否已有 eslint/prettier 配置覆盖了同样的事情
- 用祈使语气："Do X"、"Avoid Y"、"Prefer Z"
