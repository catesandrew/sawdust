export type { LocatorControls } from './createLocator.js'
export { createLocator } from './createLocator.js'
export * from './formatError.js'
export { initializeLogger } from './logger.singleton.js'
export { mergeContext, sanitizeForLogging } from './loggerUtils.js'
export { sanitizeRecord } from './sanitizeRecord.js'
export type { BaseLogger } from './types/BaseLogger.js'
export type {
  BuildTransportsCreatedResult,
  BuildTransportsResult,
} from './types/BuildTransportsResult.js'
export type { ConsolaTransportOptions } from './types/ConsolaTransportOptions.js'
export type { ConsoleTransportOptions } from './types/ConsoleTransportOptions.js'
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
