import { datadogLogs } from '@datadog/browser-logs'
import { DataDogBrowserLogsTransport } from '@loglayer/transport-datadog-browser-logs'
import { toConsoleApis } from './toConsoleApis.js'
import type {
  DatadogBrowserTransportOptions,
  LogLevelType,
} from './types/index.js'

/**
 * Registers `@datadog/browser-logs` and returns a `DataDogBrowserLogsTransport`.
 *
 * @param datadogOptions Caller-supplied configuration:
 * - `init`: Required Datadog init payload. `clientToken` must be present or the transport is skipped.
 * - `loggerName`: Optional name for a dedicated Datadog logger; defaults to the shared logger when omitted.
 * - `id`: Optional transport identifier (`'datadog-browser'` by default).
 * - `enabled`: Manual toggle; when omitted, we enable automatically if `enableInDev` is true.
 * - `enableInDev`: Convenience flag that keeps the transport quiet outside production but can be flipped for development diagnostics.
 *
 * @param service Service name reported to Datadog (used for tagging).
 * @param environment Deployment environment value mapped to the Datadog `env` field.
 * @param version Application version forwarded to Datadog for traceability.
 * @param logLevel Minimum LogLayer level emitted through the transport.
 *
 * @returns Configured `DataDogBrowserLogsTransport` or `undefined` when mandatory init options are missing.
 *
 * Initialization details:
 * - The Datadog SDK is initialized with secure defaults (secure cookies, cross-subdomain tracking).
 * - `forwardConsoleLogs` is normalized via {@link toConsoleApis} so the SDK only forwards the desired console methods.
 *
 * @example
 * ```ts
 * const ddTransport = createDatadogBrowserLogsTransport(
 *   {
 *     init: { clientToken: 'abc', site: 'datadoghq.com', service: 'env-ui' },
 *     loggerName: 'env-ui-logger',
 *   },
 *   {
 *     service: 'environment-manager-ui',
 *     environment: 'prod',
 *     version: '2.3.0',
 *     logLevel: 'info',
 *   },
 * )
 * ```
 */
export const createDatadogBrowserLogsTransport = (
  datadogOptions: DatadogBrowserTransportOptions,
  {
    service,
    environment,
    version,
    logLevel,
  }: {
    service: string
    environment: string
    version: string
    logLevel: LogLevelType
  },
): DataDogBrowserLogsTransport | undefined => {
  if (!datadogOptions.init?.clientToken) {
    return undefined
  }

  // Prevent multiple init() calls
  const alreadyInitialized = !!datadogLogs.getInitConfiguration()
  if (!alreadyInitialized) {
    datadogLogs.init({
      service,
      env: environment,
      version,
      ...datadogOptions.init,
      forwardConsoleLogs: toConsoleApis(
        datadogOptions.init?.forwardConsoleLogs,
      ),
    })
  } else {
    // Optional: warn if the requested core tags don't match the existing init
    const cfg = datadogLogs.getInitConfiguration()
    if (
      cfg &&
      ((cfg.service ?? undefined) !== service ||
        (cfg.env ?? undefined) !== environment ||
        (cfg.version ?? undefined) !== version)
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        '[sawdust] @datadog/browser-logs already initialized; using existing {service,env,version}.',
        {
          current: {
            service: cfg.service,
            env: cfg.env,
            version: cfg.version,
          },
          requested: { service, env: environment, version },
        },
      )
    }
  }

  const ddLogger = datadogOptions.loggerName
    ? datadogLogs.createLogger(datadogOptions.loggerName)
    : datadogLogs.logger

  const enableInDev = datadogOptions?.enableInDev ?? false

  return new DataDogBrowserLogsTransport({
    id: datadogOptions.id ?? 'datadog-browser',
    enabled: datadogOptions?.enabled ?? enableInDev,
    level: logLevel,
    logger: ddLogger,
  })
}
