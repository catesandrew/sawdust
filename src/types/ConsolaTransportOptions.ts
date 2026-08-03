import type { LogLevelType } from '@loglayer/shared'
import type { ConsolaInstance } from 'consola'

/**
 * Options for the Consola-backed transport.
 *
 * This transport delegates log emission to a provided {@link ConsolaInstance}.
 * It is typically used for "pretty" local output while keeping a consistent
 * LogLayer API across environments.
 *
 * ## Why this type exists
 * - **Adapter boundary:** lets you swap Consola for another pretty logger without
 *   changing LogLayer call sites—only the adapter/wiring changes.
 * - **Environment control:** toggle the transport on/off (`enabled`) and gate by
 *   level (`level`) independent of other transports (e.g., Datadog).
 * - **Diagnostics:** `consoleDebug` can surface adapter-level debugging when
 *   you are troubleshooting the transport itself.
 * - **Explicit sink:** `logger` is required so callers control the exact Consola
 *   instance (and its own formatters, reporters, or writers).
 *
 * ## Usage
 * ```ts
 * import consola from 'consola'
 *
 * const consolaLogger = consola.withTag('app')
 *
 * const opts: ConsolaTransportOptions = {
 *   id: 'pretty-dev',
 *   enabled: true,
 *   level: 'info',
 *   consoleDebug: false,
 *   logger: consolaLogger,
 * }
 *
 * // passed into your LogLayer transport factory, e.g.:
 * transports: { consola: opts }
 * ```
 */
export type ConsolaTransportOptions = {
  /**
   * Optional identifier for this transport instance.
   *
   * **Purpose:** Distinguish multiple registered transports in diagnostics,
   * metrics, or when toggling behavior by id (e.g., enable pretty-only locally).
   *
   * @example
   * // Register two transports and target them by id in config
   * { transports: { consola: { id: 'pretty-dev' }, datadog: { id: 'dd-json' } } }
   */
  id?: string

  /**
   * Enables or disables this transport.
   *
   * **Why:** In tests/CI you may want to silence pretty output while allowing
   * structured/remote transports to run—or vice versa during local dev.
   *
   * @default true
   *
   * @example
   * // Disable pretty transport under test to keep output clean
   * { transports: { consola: { enabled: false } } }
   */
  enabled?: boolean

  /**
   * If `true`, the adapter may emit extra debug information to the console
   * about how it is mapping LogLayer calls into Consola.
   *
   * **When to use:** Turn on only while diagnosing transport wiring issues
   * (level mapping, parameter ordering, etc.). Avoid leaving it enabled in
   * production as it can add noise.
   *
   * @default false
   *
   * @example
   * // Temporary troubleshooting
   * { transports: { consola: { consoleDebug: true } } }
   */
  consoleDebug?: boolean

  /**
   * Minimum log level that this transport will emit.
   *
   * **Why:** Prevents low-priority messages from reaching this pretty sink,
   * while other transports (e.g., a JSON aggregator) can still capture them.
   * If omitted, the transport should inherit the logger's global level.
   *
   * @example
   * // Show only warnings and above in the terminal
   * { transports: { consola: { level: 'warn' } } }
   */
  level?: LogLevelType

  /**
   * The Consola instance that performs the actual logging.
   *
   * **Why required:** Callers decide which Consola configuration (reporters,
   * tags, throttling) to use, keeping this adapter thin and predictable.
   *
   * @example
   * import consola from 'consola'
   * const logger = consola.withTag('api')
   * const opts: ConsolaTransportOptions = { logger }
   */
  logger?: ConsolaInstance

  /**
   * Options passed to createConsola()
   * e.g. { fancy: true, defaults: { tag: 'app' } }
   */
  createOptions?: Record<string, any>

  /**
   * When `true`, emit a single structured JSON object to the console per log call.
   * When `false`, emit human‑readable arguments (`console.*( ...args )`).
   *
   * **Why:** JSON mode creates consistent, machine‑parsable logs for aggregation; non‑JSON mode
   * favors developer readability during local debugging.
   *
   * @default true
   *
   * @example
   * // JSON object output (recommended for ingestion)
   * { transports: { consola: { json: true } } }
   *
   * @example
   * // Human‑readable output for local dev
   * { transports: { consola: { json: false } } }
   */
  json?: boolean
}
