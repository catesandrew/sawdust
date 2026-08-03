/**
 * Minimal serialisable representation of an error object.
 * Useful when consuming frameworks (e.g., Next.js) expose partial error data.
 */
export type ErrorWithMessage = {
  /** Human-readable error message (always present). */
  message: string
  /** Optional stack trace when available. */
  stack?: string
  /** Optional digest/hash emitted by some frameworks (e.g., Next.js). */
  digest?: string
  /** Catch-all for error-specific fields. */
  [k: string]: unknown
}
