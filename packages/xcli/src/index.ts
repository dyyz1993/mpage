import type { ZodType } from 'zod';

export type ZodSchema = ZodType<unknown>;

export { Core } from '@xcli/core';
export type { CoreConfig } from '@xcli/core';

export type {
  XCLIAPI,
  SiteInstance,
  SiteConfig,
  CommandContext,
  StorageContext,
  OutputContext,
  CommandHandler,
  CommandEntry,
  CommandScope,
  FlagConfig,
  ToolConfig,
  EventHandler,
  EventContext,
} from '@xcli/core';

export { SiteInstanceImpl, CommandError, DEFAULT_SCOPE, COMMAND_SCOPE_ORDER } from '@xcli/core';

export { CommandError as CommandErrorClass } from '@xcli/core';

export type { CommandResult } from '@xcli/core';
export { ok, fail, withMeta, wrapResult, isCommandResult } from '@xcli/core';

export { generateTips, formatResult } from '@xcli/tips';

export { PluginStorage } from '@xcli/core';
export { PluginLoader } from '@xcli/core';
export type { PluginStatus, PluginInstance } from '@xcli/core';

export type { CommandArgs, CommandValues } from '@xcli/core';

export { HelpGenerator, helpGenerator } from '@xcli/core';
export { OutputFormatter, outputFormatter } from '@xcli/core';

export {
  checkGuard,
  loadGuardConfig,
  clearGuardCache,
  addGuardRule,
  removeGuardRule,
  listGuardRules,
  setGuardIdentityKey,
} from '@xcli/core';
export type { GuardConfig, GuardRule } from '@xcli/core';
