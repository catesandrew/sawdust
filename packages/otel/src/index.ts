import type { LogLayerTransport, LogLevelType } from '@cues/sawdust'
import {
  LoggerlessTransport,
  type LogLayerTransportParams,
} from '@loglayer/transport'
import type { AnyValueMap, Logger } from '@opentelemetry/api-logs'
import { logs, SeverityNumber } from '@opentelemetry/api-logs'

/**
 * Options accepted by {@link otelTransport}.
 *
 * The transport emits through the global OpenTelemetry Logs API
 * (`@opentelemetry/api-logs`). The consumer owns the SDK wiring — register a
 * `LoggerProvider` via `logs.setGlobalLoggerProvider(...)` in app bootstrap and
 * every sawdust log flows into it.
 */
export interface OtelTransportOptions {
  /** Transport id recorded by LogLayer. */
  id?: string
  /** Minimum level this transport emits. */
  level?: LogLevelType
  /** Set false to build the transport but suppress emission. */
  enabled?: boolean
  /** Instrumentation scope name for the OTel logger. Default `@cues/sawdust-otel`. */
  scopeName?: string
  /** Instrumentation scope version. */
  scopeVersion?: string
  /** Called (instead of throwing) when an emit fails. */
  onError?: (error: unknown) => void
}

const SEVERITY: Record<string, SeverityNumber> = {
  trace: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
  fatal: SeverityNumber.FATAL,
}

/**
 * LogLayer transport that forwards every entry to the OpenTelemetry Logs API as
 * a LogRecord. Built on the same `@loglayer/transport` base the sawdust core
 * uses, so it drops straight into `configureLogger({ extraTransports: [...] })`.
 */
class OtelLogTransport extends LoggerlessTransport {
  private readonly otelLogger: Logger
  private readonly onError?: (error: unknown) => void

  constructor(opts: OtelTransportOptions = {}) {
    super({ id: opts.id, level: opts.level, enabled: opts.enabled })
    this.otelLogger = logs.getLogger(
      opts.scopeName ?? '@cues/sawdust-otel',
      opts.scopeVersion,
    )
    this.onError = opts.onError
  }

  shipToLogger({
    logLevel,
    messages,
    data,
    hasData,
  }: LogLayerTransportParams): unknown[] {
    const body = messages
      .map((m) => (typeof m === 'string' ? m : JSON.stringify(m)))
      .join(' ')

    try {
      this.otelLogger.emit({
        severityNumber: SEVERITY[logLevel] ?? SeverityNumber.INFO,
        severityText: String(logLevel).toUpperCase(),
        body,
        attributes:
          hasData && data
            ? (data as Record<string, unknown> as AnyValueMap)
            : undefined,
      })
    } catch (error) {
      this.onError?.(error)
    }

    return messages
  }
}

/**
 * Build an OpenTelemetry logs transport for wiring into the sawdust logger via
 * `extraTransports`.
 *
 * @example
 * ```ts
 * import { configureLogger } from '@cues/sawdust/logger'
 * import { otelTransport } from '@cues/sawdust-otel'
 *
 * configureLogger({
 *   transports: { console: { enabled: true } },
 *   extraTransports: [otelTransport({ scopeName: 'orders-api' })],
 * })
 * ```
 */
export const otelTransport = (
  opts: OtelTransportOptions = {},
): LogLayerTransport =>
  new OtelLogTransport(opts) as unknown as LogLayerTransport
