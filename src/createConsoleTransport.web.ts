'use client'
import 'client-only' // build-time guard: error if imported from server code
import { ConsoleTransport } from 'loglayer'
import type { ConsoleTransportOptions, LogLevelType } from './types/index.js'

/**
 * Factory that creates a configured console transport for LogLayer.
 *
 * @param consoleOptions Options supplied by the consumer. Key fields:
 * - `id`: Optional string identifier. Defaults to `'console'`.
 * - `enabled`: Toggle to control whether the transport emits logs. Defaults to `true`.
 * - `messageField`: When set, string logs are wrapped in an object under this field (`'msg'` by default) so downstream consumers receive structured output.
 * - `appendObjectData`: When `true`, non-string payloads are appended to console calls for easier debugging. Defaults to `false`.
 * - `level`: Minimum level that the transport should emit. If omitted, falls back to the logger’s `logLevel` param.
 *
 * @param logLevel Minimum log level decided by the caller (typically the logger instance).
 * @returns A concrete `ConsoleTransport` instance or `undefined` when the supplied options indicate no transport should be created.
 *
 * @example
 * ```ts
 * const transport = createConsoleTransport(
 *   { enabled: true, messageField: 'message' },
 *   { logLevel: 'debug' },
 * )
 * ```
 * Instantiates a console transport that emits debug-and-above logs and wraps plain strings in `{ message: ... }`.
 */
export const createConsoleTransport = (
  consoleOptions: ConsoleTransportOptions,
  {
    logLevel,
  }: {
    logLevel: LogLevelType
  },
): ConsoleTransport | undefined => {
  return new ConsoleTransport({
    id: consoleOptions.id ?? 'console',
    enabled: consoleOptions.enabled ?? true,
    logger: console,
    // Make console outputs structured when we want to:
    messageField: consoleOptions?.messageField,
    appendObjectData: consoleOptions?.appendObjectData ?? false,
    level: consoleOptions?.level || logLevel,
  })
}
