import type { LogLevelType, MessageDataType } from '@loglayer/shared'
import type { LogContext } from './LogContext.js'

/**
 * Common shape for structured log entries emitted by Sawdust transports.
 * Designed to match what Datadog and other sinks expect while remaining
 * transport-agnostic.
 */
export interface LogEntry {
  /** Severity of the log (trace → fatal). */
  level: LogLevelType
  /** Primary message payload before serialisation. */
  message: MessageDataType
  /** ISO timestamp captured at emission time. */
  timestamp: string
  /** Contextual metadata merged into the log entry. */
  context?: LogContext
  /** Additional metadata (often derived from `withMetadata`). */
  metadata?: LogContext
  /** Service identifier used for correlation (e.g., Datadog service tag). */
  service?: string
  /** Environment name (`dev`, `qa`, `prod`, etc.). */
  environment?: string
  /** Serialised error payload associated with the entry, when any. */
  err?: unknown
  /** Catch-all for transport-specific fields. */
  [k: string]: unknown
}
