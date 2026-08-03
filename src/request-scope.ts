import { getLogger } from './loggerLocator.js'
import type { BaseLogger, LogContext } from './types/index.js'

/**
 * Web/generic fallback that simply executes the callback without manipulating context.
 *
 * @remarks
 * The browser build does not have access to Node's `AsyncLocalStorage`, so we no-op here
 * while keeping the signature aligned with the Node helper. Callers can invoke the helper
 * without branching by environment.
 */
export function withRequestContext<T>(
  _bindings: LogContext | undefined,
  run: () => T,
): T
export function withRequestContext<T>(
  _bindings: LogContext | undefined,
  run: () => Promise<T>,
): Promise<T>
export function withRequestContext<T>(
  _bindings: LogContext | undefined,
  run: () => T | Promise<T>,
) {
  return run()
}

/**
 * Returns the current logger via the service locator.
 *
 * @remarks
 * In non-Node environments there is no request-scoped storage, so this is equivalent to
 * calling {@link getLogger} directly. The dedicated helper keeps API parity with the
 * Node variant.
 */
export function getRequestLogger(): BaseLogger {
  return getLogger()
}
