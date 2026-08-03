/**
 * Generic map of key/value pairs used to enrich Datadog RUM events.
 *
 * Datadog accepts any JSON-serialisable fields, so we keep the type flexible.
 * Callers can attach arbitrary metadata (e.g., `requestId`, `service`, `region`)
 * before sending actions, errors, or views.
 */
export type RumContext = Record<string, unknown>
