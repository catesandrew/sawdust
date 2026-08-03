import {
  type LogLayerTransportParams,
  LogLevel as TransportLogLevel,
} from '@loglayer/transport'
import { ConsolaTransport } from '@loglayer/transport-consola'

/**
 * Consola transport variant that can emit JSON payloads for structured log capture.
 *
 * Use `logJson=true` when collecting logs where plain strings would lose metadata
 * (e.g., shipping to platforms that expect JSON lines).
 */
export class JsonAwareConsolaTransport extends ConsolaTransport {
  /**
   * @param logJson When `true`, messages and metadata are serialized into a single JSON string.
   *                When `false`, the transport behaves like the base Consola transport but keeps data appended.
   * @param config Standard Consola transport configuration (identifier, logger instance, level, etc.).
   */
  constructor(
    private readonly logJson: boolean,
    config: ConstructorParameters<typeof ConsolaTransport>[0],
  ) {
    super(config)
  }

  /**
   * Serializes and forwards log payloads to the underlying Consola logger.
   *
   * With JSON mode enabled:
   * - Single string message → `{ "message": "<string>" }`
   * - Multiple messages → `{ "messages": [...] }`
   * - Structured data (when present) → attached under `data`.
   *
   * Without JSON mode:
   * - Appends `data` to the console arguments for richer debugging when available.
   *
   * Always ensures at least one argument is supplied to avoid empty console calls.
   */
  public override shipToLogger({
    logLevel,
    messages,
    data,
    hasData,
  }: LogLayerTransportParams) {
    let payload = messages as any[]

    if (this.logJson) {
      const structured: Record<string, unknown> = {}

      if (messages.length === 1 && typeof messages[0] === 'string') {
        structured.message = messages[0]
      } else if (messages.length > 0) {
        structured.messages = messages
      }

      if (hasData && data) {
        structured.data = data
      }

      payload = [JSON.stringify(structured)]
    } else if (hasData && data) {
      payload = [...messages, data]
    }

    const args = (payload.length > 0 ? payload : ['']) as [any, ...any[]]

    switch (logLevel) {
      case TransportLogLevel.info:
        this.logger.info(...args)
        break
      case TransportLogLevel.warn:
        this.logger.warn(...args)
        break
      case TransportLogLevel.error:
        this.logger.error(...args)
        break
      case TransportLogLevel.trace:
        this.logger.trace(...args)
        break
      case TransportLogLevel.debug:
        this.logger.debug(...args)
        break
      case TransportLogLevel.fatal:
        this.logger.fatal(...args)
        break
      default:
        this.logger.log(...args)
        break
    }

    return payload
  }
}
