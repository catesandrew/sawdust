import type { LogLevelType } from '@loglayer/shared'
import type {
  PrettyTerminalViewMode,
  Runtime,
  SimplePrettyTerminalTheme,
} from '@loglayer/transport-simple-pretty-terminal'

/**
 * Re-exported option types from `@loglayer/transport-simple-pretty-terminal`.
 *
 * - {@link PrettyTerminalViewMode} — Controls how payloads render:
 *   - `"inline"` shows compact one-line values (objects flattened when possible).
 *   - `"expanded"` shows multi-line, tree-style payloads for readability.
 * - {@link Runtime} — Indicates the execution environment (e.g., `"node"`, `"browser"`).
 *   The pretty transport may tailor its output (colors, console call shapes) per runtime.
 * - {@link SimplePrettyTerminalTheme} — Color and symbol theme used by the pretty renderer.
 *   Supply a custom theme to align with your CLI or local developer preferences.
 */
export type { PrettyTerminalViewMode, Runtime, SimplePrettyTerminalTheme }

/**
 * Options for the Simple Pretty Terminal transport.
 *
 * This transport renders human-friendly, colorized output for local development
 * while preserving a consistent LogLayer API across environments. It focuses on
 * readability (inline vs. expanded views, themes, timestamp formatting) and keeps
 * machine-parsable logging to other transports (e.g., Console JSON, Datadog).
 *
 * ## Why this type exists
 * - **Developer ergonomics:** Clear, scannable logs increase local iteration speed.
 * - **Separation of concerns:** Keep pretty-print concerns here, and structured export in
 *   other transports—use level gating (`level`) independently per transport.
 * - **Consistency:** Shared options like `id`, `enabled`, `level` mirror other transports.
 *
 * ## Usage
 * ```ts
 * import { createLogger } from './logger.js'
 * import { PrettyTransportOptions } from './types/PrettyTransportOptions.js'
 *
 * const pretty: PrettyTransportOptions = {
 *   id: 'pretty-dev',
 *   enabled: true,
 *   level: 'info',
 *   viewMode: 'inline',
 *   maxInlineDepth: 4,
 *   timestampFormat: 'HH:mm:ss.SSS',
 *   collapseArrays: true,
 *   flattenNestedObjects: true,
 *   runtime: 'node',
 * }
 *
 * const logger = createLogger({ transports: { pretty } })
 * logger.info('Server started', { port: 3000 })
 * ```
 */
export type PrettyTerminalTransportOptions = {
  /**
   * Optional identifier for this transport instance.
   *
   * **Purpose:** Distinguish multiple registered transports in diagnostics or when toggling
   * behavior by id (e.g., enable only the pretty sink locally, keep JSON in CI).
   *
   * @example
   * { transports: { pretty: { id: 'pretty-dev' }, console: { id: 'json-ci' } } }
   */
  id?: string

  /**
   * Enables or disables this transport.
   *
   * **Why:** Silence pretty logs in CI/tests to reduce noise, while leaving structured
   * transports enabled for auditing.
   *
   * @default true
   *
   * @example
   * { transports: { pretty: { enabled: false } } }
   */
  enabled?: boolean

  /**
   * If `true`, the adapter may emit extra debug information about how it maps
   * LogLayer events to the pretty renderer.
   *
   * **When to use:** Only while diagnosing transport behavior (e.g., parameter ordering,
   * truncation/expansion). Avoid in production to prevent noisy output.
   *
   * @default false
   *
   * @example
   * { transports: { pretty: { consoleDebug: true } } }
   */
  consoleDebug?: boolean

  /**
   * Minimum log level that this transport will emit.
   *
   * **Why:** Lets the pretty sink show fewer messages than other transports (e.g., only
   * warnings/errors locally while a JSON transport captures everything for analysis).
   *
   * If omitted, the transport should inherit the logger's global level.
   *
   * @example
   * { transports: { pretty: { level: 'warn' } } } // only warn/error/fatal
   */
  level?: LogLevelType

  /**
   * Maximum depth for inline data display before collapsing.
   *
   * **Why:** Inline mode favors a single line—large nested objects quickly become unreadable.
   * This depth keeps logs compact; deeper values can still be inspected in expanded mode.
   *
   * @default 4
   *
   * @example
   * // Show only the first 2 nesting levels inline
   * { transports: { pretty: { viewMode: 'inline', maxInlineDepth: 2 } } }
   */
  maxInlineDepth?: number

  /**
   * Custom theme for colors, symbols, and styles.
   *
   * **Why:** Align pretty output with team preferences or terminal accessibility needs
   * (contrast, dimming, emoji).
   *
   * @example
   * import { nordTheme } from './themes/nord.js'
   * { transports: { pretty: { theme: nordTheme } } }
   */
  theme?: SimplePrettyTerminalTheme

  /**
   * View mode for log display.
   *
   * - `"inline"` — compact, one-line rendering; great for dense streams.
   * - `"expanded"` — multi-line tree rendering for rich objects/arrays.
   *
   * **Why:** Choose the best balance of density vs. readability for your workflow.
   *
   * @default "inline"
   *
   * @example
   * // Expand objects for easier inspection
   * { transports: { pretty: { viewMode: 'expanded' } } }
   */
  viewMode?: PrettyTerminalViewMode

  /**
   * Whether to include a unique log id in the output.
   *
   * **Why:** Helps correlate scattered messages that belong to the same request/action
   * when skimming terminal output.
   *
   * @default false
   *
   * @example
   * { transports: { pretty: { showLogId: true } } }
   */
  showLogId?: boolean

  /**
   * Custom timestamp format for the prefix.
   *
   * **Why:** Humans parse `"14:02:31.123"` faster than ISO strings in a terminal.
   * Accepts either a date-fns style format string or a function that receives the
   * epoch millis and returns a string.
   *
   * @default "HH:mm:ss.SSS"
   *
   * @example
   * // date-fns style format string
   * { transports: { pretty: { timestampFormat: 'HH:mm:ss' } } }
   *
   * @example
   * // Custom function (e.g., local timezone or relative delta)
   * { transports: { pretty: { timestampFormat: (ts) => new Date(ts).toLocaleTimeString() } } }
   */
  timestampFormat?: string | ((timestamp: number) => string)

  /**
   * Whether to collapse arrays in expanded mode.
   *
   * **Why:** Long arrays (e.g., request logs, stack frames) can overwhelm output. Collapsing
   * keeps the tree short; users can expand on demand.
   *
   * @default true
   *
   * @example
   * { transports: { pretty: { viewMode: 'expanded', collapseArrays: true } } }
   */
  collapseArrays?: boolean

  /**
   * Whether to flatten nested objects with dot notation in inline mode.
   *
   * **Why:** Flattening `{ user: { id: 1 } }` to `{ 'user.id': 1 }` keeps single-line logs
   * concise and scannable.
   *
   * @default true
   *
   * @example
   * { transports: { pretty: { viewMode: 'inline', flattenNestedObjects: true } } }
   */
  flattenNestedObjects?: boolean

  /**
   * Runtime environment for output.
   *
   * **Why:** The transport adapts to runtime differences (e.g., Node vs. browser console),
   * choosing the appropriate styling and argument shapes.
   *
   * @example
   * { transports: { pretty: { runtime: 'browser' } } }
   */
  runtime: Runtime

  /**
   * In browser runtimes, include the data object as the second parameter to console calls
   * to enable richer devtools inspection (e.g., clickable object payloads).
   *
   * **Why:** Browser consoles treat the first string argument as a formatted message; passing
   * the object separately improves inspectability without sacrificing readability.
   *
   * @default false
   *
   * @example
   * { transports: { pretty: { runtime: 'browser', includeDataInBrowserConsole: true } } }
   */
  includeDataInBrowserConsole?: boolean
}
