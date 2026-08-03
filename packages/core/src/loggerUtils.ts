import type { LogContext } from './types/index.js'

/**
 * Merges optional default context with an incoming context.
 * Returns `undefined` only when both inputs are missing.
 */
export const mergeContext = (
  defaultContext: LogContext | undefined,
  context?: LogContext,
): LogContext | undefined => {
  if (!defaultContext && !context) {
    return undefined
  }

  if (!defaultContext) {
    return { ...context }
  }

  if (!context) {
    return { ...defaultContext }
  }

  return {
    ...defaultContext,
    ...context,
  }
}

type Sanitized =
  | string
  | number
  | boolean
  | null
  | Sanitized[]
  | { [key: string]: Sanitized }

const MAX_DEPTH = 5
const MAX_ARRAY_LENGTH = 50

/**
 * Recursively sanitizes arbitrary values so they are safe for logging (JSON-compatible).
 *
 * - Truncates nested structures beyond {@link MAX_DEPTH}.
 * - Limits arrays/objects to {@link MAX_ARRAY_LENGTH} items.
 * - Converts errors to `{ name, message, stack?, cause? }`.
 */
export const sanitizeForLogging = (value: unknown, depth = 0): Sanitized => {
  if (depth > MAX_DEPTH) {
    return '[truncated]'
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value instanceof Error) {
    const { name, message, stack } = value
    const result: Record<string, Sanitized> = {
      name,
      message,
    }

    if (stack) {
      result.stack = stack
    }

    const cause = (value as Error & { cause?: unknown }).cause
    if (cause !== undefined) {
      result.cause = sanitizeForLogging(cause, depth + 1)
    }

    return result
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeForLogging(item, depth + 1))
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      MAX_ARRAY_LENGTH,
    )
    const result: Record<string, Sanitized> = {}

    for (const [key, val] of entries) {
      if (typeof val === 'function' || typeof val === 'symbol') {
        continue
      }
      result[key] = sanitizeForLogging(val, depth + 1)
    }

    return result
  }

  return String(value)
}
