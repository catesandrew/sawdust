import { serializeError } from './serializeError.js'
import type { ErrorWithMessage } from './types/index.js'

/**
 * Formats error for logging
 */
export function formatError(error: unknown): ErrorWithMessage {
  if (error instanceof Error) {
    const serialized = serializeError(error) as Record<string, unknown>
    const base: ErrorWithMessage = {
      message:
        typeof serialized.message === 'string'
          ? serialized.message
          : error.message,
      stack:
        typeof serialized.stack === 'string'
          ? serialized.stack
          : typeof error.stack === 'string'
            ? error.stack
            : undefined,
      // Next.js adds a digest property to errors
      digest: (error as any).digest,
    }

    return {
      ...serialized,
      message: base.message,
      stack: base.stack,
      digest: base.digest,
    } as ErrorWithMessage
  }

  try {
    return {
      message: JSON.stringify(error),
    }
  } catch {
    return {
      message: String(error),
    }
  }
}
