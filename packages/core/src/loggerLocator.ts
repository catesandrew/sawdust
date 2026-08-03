import { createLocator } from './createLocator.js'
import { noopLogger } from './loggerNoop.js'
import type { BaseLogger, LoggerLocator } from './types/index.js'

/**
 * Shared locator controls for environments that import the generic logger entry.
 *
 * @remarks
 * Uses the same symbol as the node/web variants so all builds mutate the identical
 * slot on {@link globalThis}. The default value is the noop logger to keep logging
 * safe in pre-init phases and tests.
 */
const controls = createLocator<BaseLogger>({
  key: Symbol.for('sawdust.logger.locator'),
  createDefault: () => noopLogger,
})

/**
 * Install a new canonical logger.
 *
 * @param logger - Implementation to store; falsy values revert to the noop logger.
 * @returns The instance now tracked by the locator.
 */
const setLogger: LoggerLocator['setLogger'] = (logger) =>
  controls.set(logger ?? noopLogger)

/**
 * Resolve the current logger instance.
 *
 * @returns The live logger, or the noop logger if nothing has been configured yet.
 */
const getLogger: LoggerLocator['getLogger'] = () => controls.get()

/**
 * Reset the logger back to the noop implementation.
 *
 * Primarily used by tests and hot-reload tooling.
 */
const resetLoggerLocator: LoggerLocator['resetLoggerLocator'] = () => {
  controls.reset()
}

/**
 * Exported bag of locator helpers so consumers can destructure or reference methods.
 */
export const loggerLocator: LoggerLocator = {
  setLogger,
  getLogger,
  resetLoggerLocator,
}

export { getLogger, resetLoggerLocator, setLogger }
