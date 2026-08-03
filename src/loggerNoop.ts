import type { BaseLogger } from './types/index.js'

const noop = () => {
  // Intentionally empty; used as the default logger implementation.
}

/**
 * No-op logger used as the default instance for the service locator.
 *
 * Keeps the function signatures intact so tests and non configured environments
 * can interact with the logger API safely.
 */
export const noopLogger: BaseLogger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => noopLogger,
}

Object.freeze(noopLogger)
