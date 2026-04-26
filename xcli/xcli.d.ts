declare module 'xcli' {
  export type {
    XCLIAPI,
    SiteInstance,
    SiteConfig,
    CommandContext,
    StorageContext,
    OutputContext,
    CommandError,
    CommandHandler,
    CommandEntry,
    CommandScope,
    ZodSchema,
    FlagConfig,
    ToolConfig,
    EventHandler,
    EventContext,
  } from './src/protocol/plugin-protocol';
  export {
    CommandError as CommandErrorClass,
    SiteInstanceImpl,
    DEFAULT_SCOPE,
    COMMAND_SCOPE_ORDER,
  } from './src/protocol/plugin-protocol';
  export type { CommandResult } from './src/core/command-result';
  export { ok, fail, withMeta, wrapResult, isCommandResult } from './src/core/command-result';
  export { PluginStorage } from './src/core/plugin-storage';
  export type { PluginInstance, PluginStatus } from './src/core/plugin-loader';
  export { PluginLoader, globalLoader } from './src/core/plugin-loader';
  export type { CommandArgs, CommandValues } from './src/core/types';
}
