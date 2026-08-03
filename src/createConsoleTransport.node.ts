import { Console } from 'node:console'
import { format } from 'node:util'
import { ConsoleTransport } from 'loglayer'
import type { ConsoleTransportOptions, LogLevelType } from './types/index.js'

type ConsoleType = typeof console

type ConsoleStreamMode = NonNullable<ConsoleTransportOptions['stream']>

const buildConsole = (mode: ConsoleStreamMode): ConsoleType => {
  const nodeConsole: ConsoleType = new Console({
    stdout: process.stdout,
    stderr: process.stderr,
  })

  // Print every message through process.stdout
  const writeStdout = (...args: unknown[]) => {
    process.stdout.write(`${format(...args)}\n`)
  }
  // Print every message through process.stderr
  const writeStderr = (...args: unknown[]) => {
    process.stderr.write(`${format(...args)}\n`)
  }

  const writeLog = mode === 'stderr' ? writeStderr : writeStdout
  const writeWarn = mode === 'stdout' ? writeStdout : writeStderr

  nodeConsole.log = (...args: unknown[]) => {
    writeLog(...args)
  }
  // Keep the other level aliases in sync
  nodeConsole.info = nodeConsole.log
  nodeConsole.debug = nodeConsole.log
  // Errors still go to stderr, but you can mirror stdout if you prefer
  nodeConsole.warn = (...args: unknown[]) => {
    writeWarn(...args)
  }
  nodeConsole.error = nodeConsole.warn
  // Optional: wire up trace to reuse log before delegating
  nodeConsole.trace = (...args: unknown[]) => {
    nodeConsole.log(...args)
    Error.captureStackTrace({ stack: '' })
  }

  return nodeConsole
}

const consoleByStream: Record<ConsoleStreamMode, ConsoleType> = {
  split: buildConsole('split'),
  stdout: buildConsole('stdout'),
  stderr: buildConsole('stderr'),
}

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
  const stream = consoleOptions.stream ?? 'split'
  return new ConsoleTransport({
    id: consoleOptions.id ?? 'console',
    enabled: consoleOptions.enabled ?? true,
    logger: consoleByStream[stream],
    // Make console outputs structured when we want to:
    messageField: consoleOptions.messageField,
    appendObjectData: consoleOptions.appendObjectData ?? false,
    level: consoleOptions.level ?? logLevel,
    stringify: consoleOptions.stringify ?? false,
  })
}
