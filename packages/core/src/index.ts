export * from './formatError.js'
export { initializeLogger } from './logger.singleton.js'
export { mergeContext, sanitizeForLogging } from './loggerUtils.js'
export * from './rum.js'
export type { BaseLogger } from './types/BaseLogger.js'
export type {
  BuildTransportsCreatedResult,
  BuildTransportsResult,
} from './types/BuildTransportsResult.js'
export type { ConsolaTransportOptions } from './types/ConsolaTransportOptions.js'
export type { ConsoleTransportOptions } from './types/ConsoleTransportOptions.js'
export type {
  ConsoleApiName,
  DatadogBrowserTransportOptions,
  MatchOption,
  ProxyFn,
  RawReportType,
  SessionPersistence,
} from './types/DatadogBrowserTransportOptions.js'
export {
  consoleApiName,
  rawReportType,
  sessionPersistence,
} from './types/DatadogBrowserTransportOptions.js'
export type { DatadogDebugEvent } from './types/DatadogDebugEvent.js'
export type { DatadogTraceInjectionOptions } from './types/DatadogTraceInjectionOptions.js'
export type { DatadogTransportOptions } from './types/DatadogTransportOptions.js'
export type { ErrorWithMessage } from './types/ErrorWithMessage.js'
export type { LogContext } from './types/LogContext.js'
export type { LogEntry } from './types/LogEntry.js'
export type { LoggerImplementation } from './types/LoggerImplementation.js'
export type { LoggerLocator } from './types/LoggerLocator.js'
export type { LoggerOptions } from './types/LoggerOptions.js'
export type { LoggerTransportsOptions } from './types/LoggerTransportsOptions.js'
export type {
  ILogLayer,
  LogLayerPlugin,
  LogLayerTransport,
  LogLayerTransportParams,
  LogLevel,
  LogLevelType,
  MessageDataType,
  RawLogEntry,
} from './types/LogLayer.js'
export type {
  PrettyTerminalTransportOptions,
  PrettyTerminalViewMode,
  Runtime,
  SimplePrettyTerminalTheme,
} from './types/PrettyTerminalTransportOptions.js'
export type { RumActionContext } from './types/RumActionContext.js'
export type { RumClient } from './types/RumClient.js'
export type { RumContext } from './types/RumContext.js'
export type { RumDebugEvent } from './types/RumDebugEvent.js'
export type { RumImplementation } from './types/RumImplementation.js'
export type {
  DatadogRumOptions,
  RumInitOptions,
  Site,
} from './types/RumInitOptions.js'
export type { RumLocator } from './types/RumLocator.js'
export type { RumUser } from './types/RumUser.js'
