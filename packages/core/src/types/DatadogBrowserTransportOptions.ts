import type { Logger, LogsInitConfiguration } from '@datadog/browser-logs'
import type { LogLevelType } from '@loglayer/shared'
import type { DatadogDebugEvent } from './DatadogDebugEvent.js'

/**
 * Enumerates supported persistence backends for Datadog browser sessions.
 * Mirrors the values accepted by the Datadog RUM/browser SDKs.
 */
export const sessionPersistence = {
  COOKIE: 'cookie',
  LOCAL_STORAGE: 'local-storage',
} as const

/**
 * @inline
 */
/**
 * Convenience union of allowed session persistence strategies.
 */
export type SessionPersistence =
  (typeof sessionPersistence)[keyof typeof sessionPersistence]

/**
 * Helper shape for matcher callbacks used in configuration filters.
 * Accepts literals, regexes, or predicate functions.
 */
export type MatchOption = string | RegExp | ((value: string) => boolean)

/**
 * Signature used by proxy configuration callbacks when rewriting intake URLs.
 */
export type ProxyFn = (options: { path: string; parameters: string }) => string

/**
 * Normalised console method names recognised by Datadog for log capture.
 */
export const consoleApiName = {
  log: 'log',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const

/**
 * Union of console API names used for configuring forwarders.
 */
export type ConsoleApiName =
  (typeof consoleApiName)[keyof typeof consoleApiName]

/**
 * Supported `ReportingObserver` event types that Datadog can ingest.
 */
export const rawReportType = {
  intervention: 'intervention',
  deprecation: 'deprecation',
  cspViolation: 'csp_violation',
} as const

/**
 * Union of reporting event types consumed by the transport.
 */
export type RawReportType = (typeof rawReportType)[keyof typeof rawReportType]

/***********************************************
 * Options for the Datadog **Browser Logs** transport.
 *
 * This transport forwards LogLayer events to a provided Datadog {@link Logger}
 * from `@datadog/browser-logs`. Use it to ship structured client-side logs to
 * Datadog with consistent context and level filtering.
 *
 * ## Why this type exists
 * - **Explicit sink:** You inject the exact Datadog Logger to use (global or a named one),
 *   keeping initialization (client token, service, env, scrubbers)
 *   outside the transport.
 * - **Environment control:** Toggle on/off (`enabled`) and gate by level (`level`)
 *   independently from other transports (e.g., Pretty/Console).
 * - **Diagnostics:** `consoleDebug` can surface adapter-level information while
 *   troubleshooting mapping/parameter ordering.
 *
 * ## Usage
 * ```ts
 * import { datadogLogs } from '@datadog/browser-logs'
 *
 * datadogLogs.init({
 *   clientToken: 'xxxx',
 *   site: 'datadoghq.com',
 *   service: 'envmgr-web',
 *   env: 'prod',
 *   forwardErrorsToLogs: true,
 *   beforeSend: (log) => {
 *     // scrub PII or reduce payload size
 *     delete log.view?.referrer
 *   },
 * })
 *
 * // Use the default global logger or create a named one:
 * const ddLogger = datadogLogs.createLogger('app', { level: 'info' })
 *
 * const ddOptions: DatadogBrowserTransportOptions = {
 *   id: 'dd-browser',
 *   enabled: true,
 *   level: 'info',       // gate at the transport before calling Datadog
 *   consoleDebug: false, // set true only while diagnosing adapter issues
 *   logger: ddLogger,    // required Datadog Logger instance
 * }
 * ```
 *
 * @remarks
 * - **Privacy:** Prefer redaction via `beforeSend` in the Datadog init call; avoid sending PII.
 * - **Level gating:** This transport filters levels client-side; the Datadog Logger may also
 *   apply its own level rules. Choose the stricter of the two as needed.
 * - **Deprecations:** None at this time.
 */
export type DatadogBrowserTransportOptions = {
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
   * The Datadog Browser Logs {@link Logger} to which records are forwarded.
   *
   * **Why required:** You own Datadog initialization and configuration (token, service, env,
   * sampling, `beforeSend`, context). Injecting a specific logger makes the transport thin,
   * predictable, and testable.
   *
   * @example
   * import { datadogLogs } from '@datadog/browser-logs'
   * const logger = datadogLogs.createLogger('app', { level: 'info' })
   * const opts: DatadogBrowserTransportOptions = { logger }
   */
  logger?: Logger

  /**
   * If provided, we will call datadogLogs.init(init) for you (web only).
   * Otherwise we assume you initialized @datadog/browser-logs yourself.
   */
  init?: LogsInitConfiguration

  /** Optional name for datadogLogs.createLogger(name). If omitted, uses datadogLogs.logger */
  loggerName?: string
}
