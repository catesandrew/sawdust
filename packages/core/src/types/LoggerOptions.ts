import type { LogContext } from './LogContext.js'
import type { LoggerTransportsOptions } from './LoggerTransportsOptions.js'
import type {
  LogLayerPlugin,
  LogLayerTransport,
  LogLevelType,
} from './LogLayer.js'

export interface LoggerOptions {
  service?: string
  environment?: string
  version?: string
  /**
   * Default context applied to every log entry. Alias for `defaultMeta`.
   */
  defaultContext?: LogContext
  /** Transport setup for each environment. */
  transports?: LoggerTransportsOptions

  /** Optional global prefix for messages (LogLayer "prefix"). */
  prefix?: string
  /** Default severity gating inside LogLayer (independent of transport levels). */
  defaultLevel?: LogLevelType

  // Field placement (we default these to keep structure consistent across transports)
  contextFieldName?: string // default 'ctx'
  metadataFieldName?: string // default 'meta'
  errorFieldName?: string // default 'err'

  /** How to serialize Error objects (recommend serialize-error). */
  errorSerializer?: (err: any) => any

  /** Extra plugins to append. */
  plugins?: LogLayerPlugin[]

  /** Optional additional transports appended after the built-ins. */
  extraTransports?: LogLayerTransport[]

  /** Optional id used when we expose the underlying logger via getLoggerInstance. */
  id?: string

  /**
   * Set false to drop all log input and stop sending to the logging
   * library.
   *
   * Can be re-enabled with `enableLogging()`.
   *
   * Default is `true`.
   */
  enabled?: boolean
  /**
   * If set to true, will also output messages via console logging before
   * sending to the logging library.
   *
   * Useful for troubleshooting a logging library / transports
   * to ensure logs are still being created when the underlying
   * does not print anything.
   */
  consoleDebug?: boolean
  /**
   * If true, always copy error.message if available as a log message along
   * with providing the error data to the logging library.
   *
   * Can be overridden individually by setting `copyMsg: false` in the `onlyError()`
   * call.
   *
   * Default is false.
   */
  copyMsgOnOnlyError?: boolean
  /**
   * If set to true, the error will be included as part of metadata instead
   * of the root of the log data.
   *
   * metadataFieldName must be set to true for this to work.
   *
   * Default is false.
   */
  errorFieldInMetadata?: boolean
  /**
   * If set to true, will not include context data in the log message.
   */
  muteContext?: boolean
  /**
   * If set to true, will not include metadata data in the log message.
   */
  muteMetadata?: boolean
}
