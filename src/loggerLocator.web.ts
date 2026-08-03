import { createLocator } from './createLocator.js'
import { noopLogger } from './loggerNoop.js'
import type { BaseLogger, LoggerLocator } from './types/index.js'

/**
 * Locator controls scoped to browser consumption of the logger package.
 *
 * @remarks
 * Uses the shared symbol so any bundle (web, node, or generic) manipulates the same
 * slot on {@link globalThis}. The default value is always the noop logger to keep
 * calls safe before configuration.
 */
const controls = createLocator<BaseLogger>({
  key: Symbol.for('sawdust.logger.locator.web'),
  createDefault: () => noopLogger,
})

/** Store the final browser logger, falling back to the noop implementation. */
const setLogger: LoggerLocator['setLogger'] = (logger) =>
  controls.set(logger ?? noopLogger)

/** Retrieve the currently active browser logger tracked by the locator. */
const getLogger: LoggerLocator['getLogger'] = () => controls.get()

/** Reset the locator back to the noop logger (useful for tests and hot reload). */
const resetLoggerLocator: LoggerLocator['resetLoggerLocator'] = () => {
  controls.reset()
}

/** Export bag exposing the locator helpers for ergonomic imports. */
export const loggerLocator: LoggerLocator = {
  setLogger,
  getLogger,
  resetLoggerLocator,
}

export { getLogger, resetLoggerLocator, setLogger }
