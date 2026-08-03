import { getLogger } from './loggerLocator.web.js'
import type { BaseLogger, LogContext } from './types/index.js'

/**
 * Browser-friendly shim that mirrors the Node signature without adding context propagation.
 *
 * @remarks
 * Web runtimes lack `AsyncLocalStorage`, so we simply execute the callback. Sharing the same
 * API surface keeps server/client code symmetrical.
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
 * Retrieve the current logger from the service locator.
 *
 * @remarks
 * Identical to {@link getLogger} on the browser build; provided for parity with the Node helper.
 */
export function getRequestLogger(): BaseLogger {
  return getLogger()
}
