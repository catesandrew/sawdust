/**
 * Structured diagnostic payload emitted by the browser RUM client.
 * Consumers can attach an `onDebug` handler to introspect lifecycle events without
 * polluting production logs.
 */
export interface RumDebugEvent {
  /**
   * Category of the event describing which operation triggered it. Mirrors the
   * exposed methods on {@link RumImplementation}.
   */
  type:
    | 'init'
    | 'action'
    | 'timing'
    | 'error'
    | 'view'
    | 'user'
    | 'global-context'
    | 'session'

  /**
   * Outcome of the operation: `success` when the call reached Datadog, `skipped`
   * when the client was disabled, and `error` when an exception was caught.
   */
  status: 'skipped' | 'success' | 'error'

  /**
   * Optional human-readable description, often explaining why an operation was
   * skipped or providing additional context for successes.
   */
  detail?: string

  /**
   * Arbitrary structured data attached to the event (e.g., view/action names).
   */
  payload?: Record<string, unknown>

  /**
   * Captured error object when the operation threw. Typically surfaced when
   * Datadog SDK calls fail.
   */
  error?: unknown
}
