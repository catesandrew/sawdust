import { sanitizeForLogging } from './loggerUtils.js'
import type { LogContext } from './types/index.js'

/**
 * Normalizes an arbitrary logging context into a plain object that LogLayer can safely serialize.
 *
 * @param value Potentially nested context payload supplied by callers.
 * @returns A shallowly sanitized `Record<string, unknown>` when the input can be represented as an object,
 * or `undefined` when the value is empty or not object-like.
 *
 * Sanitization details:
 * - Delegates to `sanitizeForLogging` to strip functions, symbols, or other non-serializable values.
 * - Arrays and primitives are rejected to avoid ambiguous context shapes downstream.
 *
 * @example
 * ```ts
 * sanitizeRecord({ requestId: 'abc', user: { id: 1 } })
 * // => { requestId: 'abc', user: { id: 1 } }
 *
 * sanitizeRecord(null) // => undefined
 * sanitizeRecord(['unexpected']) // => undefined (arrays are ignored)
 * ```
 */
export const sanitizeRecord = (
  value?: LogContext,
): Record<string, unknown> | undefined => {
  if (!value) {
    return undefined
  }

  const sanitized = sanitizeForLogging(value)
  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return sanitized as Record<string, unknown>
  }
  return undefined
}
