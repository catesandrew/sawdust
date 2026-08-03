import type { ConsolaTransportOptions } from './ConsolaTransportOptions.js'
import type { ConsoleTransportOptions } from './ConsoleTransportOptions.js'
import type { PrettyTerminalTransportOptions } from './PrettyTerminalTransportOptions.js'

export interface LoggerTransportsOptions {
  /** Core console transport (core of loglayer). */
  console?: ConsoleTransportOptions
  /** Consola transport: @loglayer/transport-consola */
  consola?: ConsolaTransportOptions
  /** Simple Pretty Terminal: @loglayer/transport-simple-pretty-terminal */
  pretty?: PrettyTerminalTransportOptions
}
