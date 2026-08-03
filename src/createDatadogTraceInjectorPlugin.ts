import type { LogLayerPlugin } from '@loglayer/plugin'
import { datadogTraceInjectorPlugin } from '@loglayer/plugin-datadog-apm-trace-injector'
import type {
  DatadogDebugEvent,
  DatadogTraceInjectionOptions,
  DatadogTransportOptions,
} from './types/index.js'

/**
 * Creates a Datadog APM trace injector plugin for LogLayer.
 *
 * @param ddOptions Datadog transport configuration. `apiKey` must be present or the plugin is skipped.
 * @param ddTraceOptions Trace injection settings:
 * - `tracer`: Required `dd-trace` tracer instance.
 * - `enabled`: Optional flag (`true` by default); set to `false` to disable injection without removing the plugin.
 * - `onError`: Optional handler invoked when trace injection fails before reaching the logger-level `onError`.
 * @param environment Deployment environment label embedded in debug payloads.
 * @param service Service name used in debug log entries.
 * @param onError Optional logger-level callback for surfacing transport errors, executed when `ddTraceOptions.onError` is not provided.
 *
 * @returns A configured `LogLayerPlugin` when both an API key and tracer instance are available; otherwise `undefined`.
 *
 * Error routing:
 * - Prefers `ddTraceOptions.onError` when supplied.
 * - Falls back to the provided `onError` callback, packaging the error into a `DatadogDebugEvent`.
 *
 * @example
 * ```ts
 * const plugin = createDatadogTraceInjectorPlugin(
 *   { apiKey: process.env.DD_API_KEY! },
 *   { tracer: require('dd-trace').init(), enabled: true },
 *   {
 *     environment: 'prod',
 *     service: 'env-manager',
 *     onError: (event) => console.warn('Trace injection failed', event),
 *   },
 * )
 * ```
 */
export const createDatadogTraceInjectorPlugin = (
  ddOptions: DatadogTransportOptions,
  ddTraceOptions: DatadogTraceInjectionOptions,
  {
    environment,
    service,
    onError,
  }: {
    environment: string
    service: string
    onError?: (event: DatadogDebugEvent) => void
  },
): LogLayerPlugin | undefined => {
  const apiKey = ddOptions?.apiKey

  if (!apiKey) {
    return
  }

  if (!ddTraceOptions.tracer) {
    return
  }

  return datadogTraceInjectorPlugin({
    tracerInstance: ddTraceOptions.tracer,
    disabled: !(ddTraceOptions.enabled ?? true),
    ...(ddTraceOptions.onError
      ? {
          onError: ddTraceOptions.onError,
        }
      : onError
        ? {
            onError: (error, data) => {
              onError({
                type: 'error',
                batch: data
                  ? [
                      {
                        level: 'error',
                        message: 'datadogTraceInjectorPlugin error',
                        timestamp: new Date().toISOString(),
                        service,
                        environment,
                        context: data,
                      },
                    ]
                  : [],
                transport: 'server',
                error,
              })
            },
          }
        : {}),
  })
}
