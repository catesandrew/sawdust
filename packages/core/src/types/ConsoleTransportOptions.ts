import type { LogLevelType } from '@loglayer/shared'

/**
 * Console transport configuration.
 *
 * This transport writes logs to the JavaScript `console` (`console.debug`, `console.info`,
 * `console.warn`, `console.error`). It can emit either structured JSON objects or
 * human‑readable arguments depending on configuration.
 *
 * ### Why these options exist
 * - **Level gating** (`level`) prevents noisy logs from reaching the console.
 * - **JSON mode** (`json`) produces a single structured object per log—ideal for ingestion or
 *   consistent shape across environments.
 * - **Argument ordering** (`appendObjectData`) preserves readability in non‑JSON output when
 *   mixing strings and objects.
 * - **Message capture** (`messageField`) puts the rendered message into a stable field on the
 *   structured object.
 * - **Instance id** (`id`) helps when multiple console transports are registered (e.g., different
 *   formats per environment).
 *
 * ### Usage examples
 *
 * **Gate to info+:**
 * ```ts
 * const logger = createLogger({
 *   transports: { console: { level: 'info' } },
 * })
 * logger.debug('ignored')
 * logger.info('visible')
 * ```
 *
 * **Human‑readable output with object first/last:**
 * ```ts
 * // object first (default)
 * { transports: { console: { json: false, appendObjectData: false } } }
 * // -> console.info({ user: 'john' }, 'User logged in')
 *
 * // object last
 * { transports: { console: { json: false, appendObjectData: true } } }
 * // -> console.info('User logged in', { user: 'john' })
 * ```
 *
 * **Structured JSON with message in a field:**
 * ```ts
 * { transports: { console: { json: true, messageField: 'msg' } } }
 * // -> console.info({ msg: 'User logged in', user: 'john', level: 'info', ... })
 * ```
 */
export interface ConsoleTransportOptions {
  /**
   * Selects where console output should be written in Node.
   *
   * - `split` (default): info/debug/log -> stdout, warn/error -> stderr
   * - `stdout`: all levels -> stdout
   * - `stderr`: all levels -> stderr (recommended for MCP stdio servers)
   */
  stream?: 'split' | 'stdout' | 'stderr'
  /**
   * Whether the console transport is enabled.
   *
   * **Why:** Allows turning off console writes per environment (e.g., disable in tests).
   *
   * @default true
   *
   * @example
   * // Disable console transport under test to avoid noisy output
   * { transports: { console: { enabled: false } } }
   */
  enabled?: boolean

  /**
   * Minimum log level that this transport will emit.
   *
   * **Why:** Prevents lower‑priority messages from reaching the console while still allowing
   * higher‑severity logs through.
   *
   * If omitted, the transport inherits the logger's global level.
   *
   * @example
   * { transports: { console: { level: 'warn' } } } // only warn/error/fatal
   */
  level?: LogLevelType

  /**
   * Controls where object data (metadata/context/errors) appears when **json = false**.
   *
   * - `false` (default): object data is the **first** argument.
   * - `true`: object data is the **last** argument.
   *
   * **Why:** Keeps messages readable in non‑JSON mode when mixing strings and rich objects.
   * Has no effect when `json = true` or when `messageField` is set (since output becomes a single object).
   *
   * @default false
   *
   * @example
   * // object first
   * { transports: { console: { json: false, appendObjectData: false } } }
   * // -> console.info({ user: 'john' }, 'User logged in')
   *
   * @example
   * // object last
   * { transports: { console: { json: false, appendObjectData: true } } }
   * // -> console.info('User logged in', { user: 'john' })
   */
  appendObjectData?: boolean

  /**
   * If set, the rendered message string is placed into this field on the structured log object.
   * Multiple string parameters are joined with a single space.
   *
   * **Why:** Provides a stable message key for downstream processors and keeps the top‑level
   * object shape consistent.
   *
   * **Note:** When `messageField` is set, output is structured; in practice this pairs with `json: true`.
   *
   * @example
   * { transports: { console: { messageField: 'msg', json: true } } }
   * // -> console.info({ user: 'john', msg: 'User logged in successfully' })
   */
  messageField?: string

  /**
   * Optional identifier for this transport instance.
   *
   * **Why:** Useful when registering multiple console transports with different purposes
   * (e.g., one pretty printer for local dev, one JSON emitter for CI).
   *
   * @example
   * { transports: { console: { id: 'pretty-dev', json: false } } }
   */
  id?: string

  /**
   * If defined, populates the field with the ISO date. If `dateFn` is defined,
   * will call `dateFn` to derive the date
   *
   * @example
   * // Preferred: add timestamp in a formatter upstream
   * format(entry) { return { ...entry, timestamp: new Date().toISOString() } }
   */
  dateField?: string

  /**
   * If defined, populates the field with the log level. If `levelFn` is
   * defined, will call `levelFn` to derive the level
   *
   * @example
   * // Preferred: map level upstream
   * format(entry) { return { ...entry, severity: entry.level } }
   */
  levelField?: string

  /**
   * If defined, a function that returns a string or number for the value to be
   * used for the `dateField`
   *
   * @example
   * // Preferred: use a uniform formatter
   * format(entry) { return { ...entry, ts: Date.now() } }
   */
  dateFn?: () => string | number
  /**
   * This makes the console transport emit logs as JSON objects.
   */
  stringify?: boolean
}
