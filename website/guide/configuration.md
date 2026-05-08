---
title: 配置管理
---

# 配置管理

xcli-core 提供多层配置管理：RC 文件 + 环境变量 + 命令行参数。

## RC 配置文件

配置文件位于 `~/.<configDirName>/config.json`，由 `CoreConfig.configDirName` 决定路径。

```typescript
import { loadConfig, saveConfig, getConfigValue } from '@dyyz1993/xcli-core';

const config = loadConfig();
saveConfig({ ...config, theme: 'dark' });
const theme = getConfigValue('theme');
```

## 环境变量

环境变量前缀由 `CoreConfig.envPrefix` 决定：

```bash
# 如果 envPrefix = 'MY_CLI'
export MY_CLI_THEME=dark
export MY_CLI_OUTPUT=json
```

## 配置优先级

从高到低：

1. 命令行参数
2. 环境变量
3. RC 配置文件
4. 默认值

## API

```typescript
loadConfig(): RcConfig;
saveConfig(config: RcConfig): void;
getConfigValue(key: string): unknown;
setConfigValue(key: string, value: unknown): void;
getEffectiveValue(key: string): unknown;
```
