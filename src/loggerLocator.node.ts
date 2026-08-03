import { createLocator } from './createLocator.js'
import { noopLogger } from './loggerNoop.js'
import type { BaseLogger, LoggerLocator } from './types/index.js'

/**
 * Internal locator controls bound to the Node runtime.
 *
 * @remarks
 * We pass a stable symbol so every Node bundle (including Jest or worker threads)
 * shares the same slot on {@link globalThis}. The default factory returns the noop logger,
 * ensuring callers always receive a safe implementation even before configuration.
 */
const controls = createLocator<BaseLogger>({
  key: Symbol.for('sawdust.logger.locator.node'),
  createDefault: () => noopLogger,
})

/**
 * Store the canonical Node logger.
 *
 * @param logger - Concrete logger instance. `null`/`undefined` resets to the noop logger.
 * @returns The instance now tracked by the locator.
 */
const setLogger: LoggerLocator['setLogger'] = (logger) =>
  controls.set(logger ?? noopLogger)

/**
 * Resolve the current Node logger tracked by the locator.
 *
 * @returns The live logger instance (noop by default).
 */
const getLogger: LoggerLocator['getLogger'] = () => controls.get()

/**
 * Reset the locator to the noop logger.
 *
 * Useful for tests or hot-reload scenarios where you need a clean slate.
 */
const resetLoggerLocator: LoggerLocator['resetLoggerLocator'] = () => {
  controls.reset()
}

/**
 * Convenience bag exposing the locator API.
 *
 * Consumers can either import this object or the named helpers below.
 */
export const loggerLocator: LoggerLocator = {
  setLogger,
  getLogger,
  resetLoggerLocator,
}

export { getLogger, resetLoggerLocator, setLogger }
