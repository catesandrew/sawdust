import type { LogLevelType } from '@loglayer/shared'
import type { DDTransportOptions } from 'datadog-transport-common'
import type { SetOptional } from 'type-fest'
import type { DatadogDebugEvent } from './DatadogDebugEvent.js'

export type DatadogTransportOptions = {
  /**
   * Optional identifier for this transport instance.
   *
   * **Purpose:** Distinguish multiple registered transports in diagnostics,
   * metrics, or when toggling behavior by id (e.g., enable Datadog in prod only).
   *
   * @example
   * // Register two transports and target them by id in config
   * { transports: { pretty: { id: 'pretty-dev' }, datadog: { id: 'dd-browser' } } }
   */
  id?: string

  /**
   * Enables or disables this transport.
   *
   * **Why:** In local dev or tests you may want to disable remote shipping while
   * keeping pretty/console output enabled.
   *
   * @default true
   *
   * @example
   * // Disable Datadog during tests
   * { transports: { datadog: { enabled: false } } }
   */
  enabled?: boolean

  /**
   * When false, the transport is disabled outside production unless explicitly enabled.
   * Defaults to false.
   */
  enableInDev?: boolean

  /**
   * Hook for inspecting transport activity.
   */
  onDebug?: (event: DatadogDebugEvent) => void

  /**
   * API key (used in server environments).
   */
  apiKey?: string

  /**
   * If `true`, the adapter may emit extra debug information to the console
   * about how it maps LogLayer calls into Datadog Browser Logs.
   *
   * **When to use:** Turn on only while diagnosing transport wiring (level mapping,
   * parameter ordering). Avoid enabling in production to prevent noisy output.
   *
   * @default false
   *
   * @example
   * // Temporary troubleshooting
   * { transports: { datadog: { consoleDebug: true } } }
   */
  consoleDebug?: boolean

  /**
   * Minimum log level that this transport will emit.
   *
   * **Why:** Prevents low-priority messages from being sent to Datadog from the browser,
   * while other transports (e.g., pretty console) can still show them locally.
   * If omitted, the transport should inherit the logger's global level.
   *
   * @example
   * // Only warn/error/fatal go to Datadog; info/debug stay local
   * { transports: { datadog: { level: 'warn' } } }
   */
  level?: LogLevelType

  /**
   * The options to pass to the datadog-transport-common instance.
   */
  options: SetOptional<DDTransportOptions, 'ddClientConf'>
  /**
   * The field name to use for the message. Default is "message".
   */
  messageField?: string
  /**
   * The field name to use for the log level. Default is "level".
   */
  levelField?: string
  /**
   * The field name to use for the timestamp. Default is "time".
   */
  timestampField?: string
  /**
   * A custom function to stamp the timestamp
   */
  timestampFunction?: () => any
}
