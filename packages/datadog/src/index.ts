import type {
  LogLayerPlugin,
  LogLayerTransport,
  LogLevelType,
} from '@cues/sawdust'
import { createDatadogTraceInjectorPlugin } from './createDatadogTraceInjectorPlugin.js'
import { createDatadogTransport } from './createDatadogTransport.js'
import type { DatadogTraceInjectionOptions } from './types/DatadogTraceInjectionOptions.js'
import type { DatadogTransportOptions } from './types/DatadogTransportOptions.js'

/**
 * Options accepted by {@link datadogTransport}. Combines the caller-owned
 * `service`/`logLevel` runtime context with the full
 * {@link DatadogTransportOptions} bag.
 */
export type DatadogTransportFactoryOptions = DatadogTransportOptions & {
  /** Logical service name added to Datadog tags and payload metadata. */
  service: string
  /** Minimum LogLayer level emitted by the transport. */
  logLevel: LogLevelType
}

/**
 * Builds a server-side Datadog log transport for wiring into the sawdust logger
 * via `extraTransports`. Returns `undefined` when no `apiKey` is supplied (the
 * transport is then skipped, matching the previous built-in behaviour).
 *
 * @example
 * ```ts
 * configureLogger({
 *   extraTransports: [
 *     datadogTransport({ service: 'api', logLevel: 'info', apiKey, options: {} }),
 *   ],
 * })
 * ```
 */
export const datadogTransport = (
  opts: DatadogTransportFactoryOptions,
): LogLayerTransport | undefined => {
  const { service, logLevel, ...datadogOptions } = opts
  return createDatadogTransport(datadogOptions, {
    service,
    logLevel,
    onDebug: datadogOptions.onDebug,
  })
}

/**
 * Options accepted by {@link datadogTraceInjectorPlugin}. Combines the
 * {@link DatadogTraceInjectionOptions} (including the `dd-trace` `tracer`) with
 * the `apiKey`/`service`/`environment` context previously threaded through the
 * logger.
 */
export type DatadogTraceInjectorPluginOptions = DatadogTraceInjectionOptions & {
  /** Datadog API key. Required — the plugin is skipped when omitted. */
  apiKey?: string
  /** Service name used in debug payloads. */
  service?: string
  /** Deployment environment label embedded in debug payloads. */
  environment?: string
}

/**
 * Builds the Datadog APM trace-injection LogLayer plugin for wiring into the
 * sawdust logger via `plugins`. Returns `undefined` when either `apiKey` or the
 * `dd-trace` `tracer` is missing.
 *
 * @example
 * ```ts
 * configureLogger({
 *   plugins: [datadogTraceInjectorPlugin({ apiKey, tracer: ddTrace.init() })],
 * })
 * ```
 */
export const datadogTraceInjectorPlugin = (
  opts: DatadogTraceInjectorPluginOptions,
): LogLayerPlugin | undefined => {
  const { apiKey, service = '', environment = '', ...traceOptions } = opts
  return createDatadogTraceInjectorPlugin(
    { apiKey } as DatadogTransportOptions,
    traceOptions,
    { environment, service },
  )
}

export type { DatadogDebugEvent } from './types/DatadogDebugEvent.js'
export type { DatadogTraceInjectionOptions } from './types/DatadogTraceInjectionOptions.js'
export type { DatadogTransportOptions } from './types/DatadogTransportOptions.js'
