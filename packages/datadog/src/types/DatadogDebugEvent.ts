import type { LogEntry } from '@cues/sawdust'

/**
 * Debug telemetry emitted by the Datadog transports to help diagnose delivery
 * issues without relying on console output.
 */
export type DatadogDebugEvent =
  | {
      /** Emitted when a log entry is enqueued for transport. */
      type: 'enqueue'
      /** The log entry being buffered. */
      entry: LogEntry
      /** Current queue size after enqueueing. */
      queueSize: number
      /** Transport responsible for handling the batch. */
      transport: 'browser' | 'server'
    }
  | {
      /** Emitted when a batch flush is triggered. */
      type: 'flush'
      /** Collection of log entries being shipped. */
      batch: LogEntry[]
      /** Transport responsible for handling the batch. */
      transport: 'browser' | 'server'
    }
  | {
      /** Emitted when the transport encounters an error while flushing. */
      type: 'error'
      /** Batch that failed to flush. */
      batch: LogEntry[]
      /** Transport responsible for handling the batch. */
      transport: 'browser' | 'server'
      /** Underlying error thrown by the transport pipeline. */
      error: unknown
      /** Optional HTTP response details when available. */
      response?: {
        status: number
        statusText: string
        body?: string
      }
    }
