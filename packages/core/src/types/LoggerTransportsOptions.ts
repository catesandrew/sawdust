import type { ConsolaTransportOptions } from './ConsolaTransportOptions.js'
import type { ConsoleTransportOptions } from './ConsoleTransportOptions.js'
import type { DatadogBrowserTransportOptions } from './DatadogBrowserTransportOptions.js'
import type { DatadogTransportOptions } from './DatadogTransportOptions.js'
import type { PrettyTerminalTransportOptions } from './PrettyTerminalTransportOptions.js'

export interface LoggerTransportsOptions {
  /** Core console transport (core of loglayer). */
  console?: ConsoleTransportOptions
  /** Consola transport: @loglayer/transport-consola */
  consola?: ConsolaTransportOptions
  /** Simple Pretty Terminal: @loglayer/transport-simple-pretty-terminal */
  pretty?: PrettyTerminalTransportOptions
  /** Datadog server transport (Node only): @loglayer/transport-datadog */
  datadog?: DatadogTransportOptions
  /** Datadog Browser Logs transport (Web only): @loglayer/transport-datadog-browser-logs */
  datadogBrowser?: DatadogBrowserTransportOptions
}
