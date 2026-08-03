import { DataDogTransport } from '@loglayer/transport-datadog'
import type {
  DatadogDebugEvent,
  DatadogTransportOptions,
  LogLevelType,
} from './types/index.js'

/**
 * Builds a server-side Datadog log transport using the @loglayer integration.
 *
 * @param datadogOptions Caller's Datadog configuration:
 * - `apiKey`: Required, otherwise the transport is skipped.
 * - `enableInDev`: Enables the transport when `true` even if `enabled` is unset.
 * - `enabled`: Optional explicit toggle overriding `enableInDev`.
 * - `options`: Additional DataDogTransport options (ddtags, ddsource, send intervals, etc.).
 * @param service Logical service name added to Datadog tags and payload metadata.
 * @param logLevel Minimum LogLayer level emitted by the transport.
 * @param onDebug Optional callback receiving `DatadogDebugEvent` objects when the transport reports errors.
 *
 * @returns A configured `DataDogTransport`, or `undefined` when the API key is missing.
 *
 * Tag handling:
 * - Always includes `service:<service>` so Datadog can group logs.
 * - Supports extra comma-separated tags via `options.ddtags`, or key/value objects when using the complex form.
 *
 * Error handling:
 * - When `onDebug` is provided, we hook into the transport `onError` and surface failures with empty batches (Datadog server errors rarely include log payloads).
 *
 * @example
 * ```ts
 * const transport = createDatadogTransport(
 *   {
 *     apiKey: process.env.DD_API_KEY!,
 *     enableInDev: false,
 *     options: { ddtags: 'team:platform,region:us-east-1' },
 *   },
 *   {
 *     service: 'env-manager-api',
 *     logLevel: 'info',
 *     onDebug: (event) => console.error('Datadog transport error', event),
 *   },
 * )
 * ```
 */
export const createDatadogTransport = (
  datadogOptions: DatadogTransportOptions,
  {
    service,
    logLevel,
    onDebug,
  }: {
    service: string
    logLevel: LogLevelType
    onDebug?: (event: DatadogDebugEvent) => void
  },
): DataDogTransport | undefined => {
  const apiKey = datadogOptions?.apiKey

  if (!apiKey) {
    return undefined
  }

  const enableInDev = datadogOptions?.enableInDev ?? false
  const ddtags = datadogOptions?.options?.ddtags
    ?.split(',')
    .map((tag) => tag.trim())

  const tags: string[] = [`service:${service}`]

  if (ddtags) {
    if (Array.isArray(ddtags)) {
      tags.push(...ddtags)
    } else {
      for (const [key, value] of Object.entries(ddtags)) {
        tags.push(`${key}:${value}`)
      }
    }
  }

  return new DataDogTransport({
    id: 'datadog',
    enabled: datadogOptions?.enabled ?? enableInDev,
    level: logLevel,
    options: {
      ddClientConf: {
        authMethods: {
          apiKeyAuth: apiKey,
        },
      },
      ddServerConf: {
        site: datadogOptions?.options?.ddServerConf?.site ?? 'datadoghq.com',
      },
      ddsource: datadogOptions?.options?.ddsource ?? 'node',
      ddtags: tags.length > 0 ? tags.join(',') : undefined,
      service: datadogOptions?.options?.service ?? service,
      sendIntervalMs: datadogOptions?.options?.sendIntervalMs,
      sendImmediate: datadogOptions?.options?.sendImmediate ?? false,
      ...(onDebug && {
        onError: (error) => {
          onDebug({
            type: 'error',
            batch: [],
            transport: 'server',
            error,
          })
        },
      }),
    },
  })
}
