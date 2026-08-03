import type { LogLayerTransport, LogLevelType } from '@cues/sawdust'
import { createDatadogBrowserLogsTransport } from './createDatadogBrowserLogsTransport.js'
import type { DatadogBrowserTransportOptions } from './types/DatadogBrowserTransportOptions.js'

/**
 * Options accepted by {@link datadogBrowserTransport}. Combines the caller-owned
 * `service`/`environment`/`version`/`logLevel` runtime context with the full
 * {@link DatadogBrowserTransportOptions} bag.
 */
export type DatadogBrowserTransportFactoryOptions =
  DatadogBrowserTransportOptions & {
    /** Service name reported to Datadog (used for tagging). */
    service: string
    /** Deployment environment mapped to the Datadog `env` field. */
    environment: string
    /** Application version forwarded to Datadog for traceability. */
    version: string
    /** Minimum LogLayer level emitted through the transport. */
    logLevel: LogLevelType
  }

/**
 * Builds a Datadog Browser Logs transport for wiring into the sawdust logger via
 * `extraTransports`. Returns `undefined` when the mandatory init options are
 * missing.
 *
 * @example
 * ```ts
 * configureLogger({
 *   extraTransports: [
 *     datadogBrowserTransport({
 *       service: 'web',
 *       environment: 'prod',
 *       version: '1.0.0',
 *       logLevel: 'info',
 *       init: { clientToken: 'pub...' },
 *     }),
 *   ],
 * })
 * ```
 */
export const datadogBrowserTransport = (
  opts: DatadogBrowserTransportFactoryOptions,
): LogLayerTransport | undefined => {
  const { service, environment, version, logLevel, ...datadogOptions } = opts
  return createDatadogBrowserLogsTransport(datadogOptions, {
    service,
    environment,
    version,
    logLevel,
  })
}

export type {
  ConsoleApiName,
  DatadogBrowserTransportOptions,
  MatchOption,
  ProxyFn,
  RawReportType,
  SessionPersistence,
} from './types/DatadogBrowserTransportOptions.js'
export {
  consoleApiName,
  rawReportType,
  sessionPersistence,
} from './types/DatadogBrowserTransportOptions.js'
export type { DatadogDebugEvent } from './types/DatadogDebugEvent.js'
