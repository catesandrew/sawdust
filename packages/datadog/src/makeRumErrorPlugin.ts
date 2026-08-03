import { sanitizeForLogging, sanitizeRecord } from '@cues/sawdust'
import type { LogLayerPlugin } from '@loglayer/plugin'
import type { RumClient } from './types/index.js'

/**
 * Builds a LogLayer plugin that forwards error-bearing logs to Datadog RUM via
 * `getRumClient().addError`. Reproduces the behaviour of the former hardcoded
 * `forwardErrorToRum` path in the browser logger, now opt-in through the
 * `plugins` seam.
 *
 * The forwarding is best-effort: any failure is swallowed so RUM issues never
 * block log emission. Uses the `shouldSendToLogger` hook (which receives the
 * original `error` and `messages`) and always returns `true` so the log still
 * reaches every transport.
 */
export const makeRumErrorPlugin = (
  getRumClient: () => RumClient,
): LogLayerPlugin => ({
  id: 'datadog-rum-error',
  shouldSendToLogger(params) {
    const err = params.error
    if (err) {
      forwardErrorToRum(
        getRumClient,
        err,
        params.messages ?? [],
        params.metadata,
      )
    }
    return true
  },
})

const forwardErrorToRum = (
  getRumClient: () => RumClient,
  err: unknown,
  messages: unknown[],
  context?: Record<string, unknown>,
): void => {
  try {
    const rum = getRumClient()
    if (!rum?.isEnabled()) {
      return
    }

    const serializedMessages = messages
      .map((message) => {
        if (typeof message === 'string') {
          return message
        }
        if (
          typeof message === 'number' ||
          typeof message === 'boolean' ||
          typeof message === 'bigint'
        ) {
          return String(message)
        }
        return sanitizeForLogging(message)
      })
      .filter((value) => value !== undefined)

    const baseContext = sanitizeRecord(context)
    const rumContext: Record<string, unknown> = baseContext
      ? { ...baseContext }
      : {}

    if (serializedMessages.length > 0) {
      rumContext.logMessages = serializedMessages
    }

    if (Object.keys(rumContext).length > 0) {
      rum.addError(err, rumContext as any)
    } else {
      rum.addError(err)
    }
  } catch {
    // RUM forwarding should never block logger output
  }
}
