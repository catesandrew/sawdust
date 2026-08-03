import type { BaseLogger } from './BaseLogger.js'
import type { LogContext } from './LogContext.js'
import type {
  LogLayerTransport,
  LogLevelType,
  RawLogEntry,
} from './LogLayer.js'

/**
 * Public, environment-agnostic logger contract that mirrors the LogLayer fluent API
 * and exposes a few convenience helpers for context propagation.
 */
export interface LoggerImplementation extends BaseLogger {
  /**
   * Returns the lowest log level currently enabled on the logger.
   */
  getLevel(): LogLevelType

  /**
   * Adds contextual metadata to subsequent log entries.
   */
  withContext(ctx: Record<string, any>): LoggerImplementation
  /**
   * Adds arbitrary metadata (non-context) to subsequent log entries.
   */
  withMetadata(meta: Record<string, any>): LoggerImplementation
  /**
   * Associates an error object with subsequent log entries.
   */
  withError(err: any): LoggerImplementation

  /**
   * Emits a metadata-only entry at an optional level (passes through to LogLayer).
   */
  metadataOnly(meta: Record<string, any>, level?: LogLevelType): void
  /**
   * Emits an error-only entry at an optional level.
   */
  errorOnly(
    err: any,
    opts?: { logLevel?: LogLevelType; copyMsg?: boolean },
  ): void

  /**
   * Returns a cloned logger that prefixes messages with the supplied string.
   */
  withPrefix(prefix: string): LoggerImplementation
  /**
   * Creates a child logger inheriting options and merging default context.
   */
  child(options?: LogContext): LoggerImplementation

  /**
   * Enables all logging.
   */
  enableLogging(): void
  /**
   * Disables all logging.
   */
  disableLogging(): void
  /**
   * Sets the minimum enabled level.
   */
  setLevel(level: LogLevelType): void
  /**
   * Enables a specific log level.
   */
  enableIndividualLevel(level: LogLevelType): void
  /**
   * Disables a specific log level.
   */
  disableIndividualLevel(level: LogLevelType): void
  /**
   * Indicates whether the provided level is currently active.
   */
  isLevelEnabled(level: LogLevelType): boolean

  /**
   * Returns the current context object or `undefined` when none exists.
   */
  getContext(): Record<string, any> | undefined
  /**
   * Clears the active context object.
   */
  clearContext(): void
  /**
   * Temporarily prevents context from being attached to log entries.
   */
  muteContext(): void
  /**
   * Re-enables context attachment.
   */
  unMuteContext(): void
  /**
   * Temporarily prevents metadata from being attached to log entries.
   */
  muteMetadata(): void
  /**
   * Re-enables metadata attachment.
   */
  unMuteMetadata(): void

  /**
   * Emits a raw log entry without additional processing.
   */
  raw(entry: RawLogEntry): void

  /**
   * Replaces transports and returns a new logger instance wrapping the updated transport set.
   */
  withFreshTransports(
    t: LogLayerTransport | LogLayerTransport[],
  ): LoggerImplementation
  /**
   * Retrieves a transport-specific logger instance by ID.
   */
  getLoggerInstance<Library>(id: string): Library | undefined

  /**
   * Runs a function with extra context automatically injected into logs.
   */
  runWithContext<T>(ctx: Record<string, any>, fn: () => T): T
  /**
   * Runs an async function with extra context automatically injected into logs.
   */
  runWithContext<T>(ctx: Record<string, any>, fn: () => Promise<T>): Promise<T>
}
