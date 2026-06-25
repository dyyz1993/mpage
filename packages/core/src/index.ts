export { Core } from './core.js';
export type { CoreConfig } from './core.js';

export {
  createPaths,
  getEnvVar,
  getDefaultPort,
  CONFIG_DIR,
  SESSION_DIR,
  DAEMON_CONFIG_PATH,
  DAEMON_SOCKET_PATH,
  DEFAULT_CHROMIUM_PATH,
  DAEMON_PORT,
} from './constants.js';

export type {
  XCLIAPI,
  SiteConfig,
  SiteInstance,
  CommandContext,
  ContextExtender,
  CommandEntry,
  CommandHandler,
  CommandScope,
  BaseScope,
  StorageContext,
  OutputContext,
  OutputMode,
  FlagConfig,
  ToolConfig,
  EventHandler,
  EventContext,
  ZodSchema,
  CommandHooks,
  HookContext,
  AfterHookContext,
  ScanOptions,
  ScanResult,
  PluginMeta,
  LoginConfig,
  SessionExtractor,
  PipelineContext,
  Middleware,
} from './protocol/plugin-protocol.js';

export {
  COMMAND_SCOPE_ORDER,
  BROWSER_SCOPE_ORDER,
  DEFAULT_SCOPE,
  CommandError,
  SiteInstanceImpl,
  GroupedSiteInstance,
  validateArgs,
  buildInputSchema,
} from './protocol/plugin-protocol.js';

export { ok, fail, withMeta, wrapResult, isCommandResult } from './command-result.js';
export type { CommandResult } from './command-result.js';

export type { SessionInfo, CommandArgs, CommandValues } from './types.js';

export { PluginLoader } from './plugin-loader.js';
export type { BuiltinCommandEntry } from './plugin-loader.js';
export { readPluginMeta } from './plugin-loader.js';
export { PluginInstance } from './plugin-instance.js';
export type { PluginStatus, PluginLoaderHost } from './plugin-instance.js';

export {
  PluginStorage,
  GlobalStorage,
  CacheStorage,
  TmpStorage,
  CompositeStorage,
} from './plugin-storage.js';
export type { PluginStore, GlobalStore, CacheStore, TmpStore } from './protocol/plugin-protocol.js';

export { HelpGenerator, helpGenerator } from './help/help-generator.js';
export type { HelpOptions } from './help/help-generator.js';

export { OutputFormatter, outputFormatter } from './output-formatter.js';
export type { FormatOptions, EnvelopeFormatOptions } from './output-formatter.js';

export {
  parseArgs,
  mergeArgsWithDefaults,
  resolveShortOptions,
  UnknownOptionError,
} from './arg-parser.js';
export type { ParsedArgs, ParseArgsOptions } from './arg-parser.js';

export { coerceCliArgs } from './param-coercion.js';

export { unquote, extractPositionalParams, mapPositionalValues } from './positional-params.js';

export {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  getEffectiveValue,
  getViewerHost,
  getChromiumPath,
  getDaemonPort,
  getViewerUrl,
  getAllConfigKeys,
  CONFIG_FILE,
  CONFIG_KEY_MAP,
} from './rc-config.js';
export type { RcConfig, ConfigSource } from './rc-config.js';

export {
  checkGuard,
  loadGuardConfig,
  clearGuardCache,
  addGuardRule,
  removeGuardRule,
  listGuardRules,
  setGuardIdentityKey,
} from './agent-guard.js';
export type { GuardConfig, GuardRule } from './agent-guard.js';

export { validateExecution, formatValidationReport } from './validator.js';
export type { ValidationResult, ToolCallRecord } from './validator.js';

// --- New Phase 2 exports (domain-agnostic) ---

export type { SessionMeta } from './session/session-meta.js';
export type { SessionManagerContract } from './session/session-manager-interface.js';
export { SessionManager } from './session/session-manager.js';
export type { SessionPersistence } from './session/session-persistence.js';
export { FileSessionPersistence } from './session/session-persistence.js';
export type { SessionLifecycle } from './session/session-lifecycle.js';
export {
  findSession,
  createSessionMeta,
  removeSession,
  getSession,
  clearAll as clearAllSessions,
  listSessions,
  sessions,
  SessionStore,
} from './session/session-store.js';
export {
  saveArchive,
  loadArchive,
  listArchives,
  searchArchives,
  diffArchives,
  appendCommandToArchive,
  configureArchiveStore,
} from './session/session-archive.js';
export type {
  ToolCallRecord as ArchiveToolCallRecord,
  CommandArchiveEntry,
  OutlineEntry,
  SessionArchive,
  ArchiveStoreConfig,
} from './session/session-archive.js';

export { runDaemonHost } from './daemon/daemon-host.js';
export type { DaemonHostConfig } from './daemon/daemon-host.js';
export type { IPCMessage, IPCResponse } from './daemon/ipc-types.js';
export type { WorkerContext, WorkerEntryPoint, DaemonConfig } from './daemon/worker-protocol.js';
export { DEFAULT_DAEMON_CONFIG } from './daemon/worker-protocol.js';
export {
  isDaemonRunning,
  startDaemon,
  stopDaemon,
  getDaemonStatus,
  killAllDaemon,
  startWSServer,
  stopWSServer,
  getWSServer,
  ensureDaemon,
  daemonRpc,
} from './daemon/daemon-manager.js';
export type { ExtendedDaemonConfig, DaemonRpcConfig } from './daemon/daemon-manager.js';
export { WorkerManager } from './daemon/worker-manager.js';
export type { WorkerManagerConfig } from './daemon/worker-manager.js';
export { startHttpServer } from './daemon/http-server.js';
export type { RPCHandler, HttpServerConfig } from './daemon/http-server.js';
export { WSServer } from './daemon/ws-server.js';
export type { WSMessage, WSServerConfig, WSMessageHandler } from './daemon/ws-server.js';
export { WSClient } from './daemon/ws-client.js';
export type { WSClientConfig, WSMessageCallback, WSEventCallback } from './daemon/ws-client.js';

export type {
  PluginInstallerType,
  InstallOptions,
  PluginInstance as InstalledPluginInstance,
  PluginInstaller,
} from './plugin/plugin-installer.js';

export { PluginInstallerRegistry } from './plugin/plugin-installer-registry.js';
export type { InstallerRegistryConfig } from './plugin/plugin-installer-registry.js';

// Plugin installation utility functions
export {
  downloadToFile,
  extractTarGz,
  flattenPackageRoot,
  verifyPlugin,
  safeCleanup,
} from './plugin/index.js';
export type { PluginVerifyResult, VerifyPluginOptions } from './plugin/index.js';

export { NpmInstaller } from './plugin/index.js';
export { detectSourceType, deriveName } from './plugin/index.js';
export type { SourceType } from './plugin/index.js';

export type { ScopeDefinition, ScopeLevel, ScopeConfig } from './command/scope.js';
export { DEFAULT_SCOPE as DEFAULT_GENERIC_SCOPE } from './command/scope.js';

export { ScopeRegistry } from './command/scope-registry.js';
export type { ScopedCommand } from './command/scope-registry.js';

export { ScaffoldEngine } from './scaffold/index.js';
export type {
  ScaffoldTemplate,
  TemplateFile,
  TemplateVariable,
  ScaffoldOptions,
  ScaffoldResult,
} from './scaffold/index.js';
export {
  BASE_CLI_TEMPLATE,
  MINIMAL_PLUGIN_TEMPLATE,
  BROWSER_APP_TEMPLATE,
  DATABASE_CLI_TEMPLATE,
  API_CLI_TEMPLATE,
} from './scaffold/index.js';

export { DebugHost, createDebugHost, defineCommands } from './debug/index.js';
export type {
  DebugHostOptions,
  ExecContext,
  CommandMap,
  CommandDef,
  CommandDefs,
  InferCommandMap,
} from './debug/index.js';

export { generateTips } from './output/tips-engine.js';

export type { TipLevel, Tip } from './tip.js';
export { TipCollector, normalizeTip, normalizeTips, tipsToMessages, tip } from './tip.js';

export { readStdin, readCommandFile, splitFileLine } from './stdin.js';

export { extractParamFields, getCommandParamFields } from './param-schema.js';
export type { ParamFieldInfo } from './param-schema.js';

export {
  unwrapZod,
  fieldsFromZodObject as fieldsFromZodObjectReflected,
  extractEnumValues,
  zodTypeToContractType,
} from './param-reflection.js';
export type { ZodUnwrapResult, ReflectedField } from './param-reflection.js';

export {
  parseChain,
  executeChain,
  isOperator,
  splitCommand,
  parseCommandArgs,
  registerCommandDefinition,
} from './chain.js';
export type {
  ChainOperator,
  ChainStep,
  ParsedChain,
  ChainGroup,
  ChainStepResult,
  ChainResult,
} from './chain.js';

export { HttpServer, Router, cors, bearerTokenAuth, jsonBody } from './http/index.js';
export type {
  HttpServerConfig as HttpMiddlewareServerConfig,
  HttpRequest,
  HttpResponse,
  HttpMiddleware,
  RouteHandler,
} from './http/index.js';
