import { AsyncLocalStorage } from 'node:async_hooks'
import { getLogger } from './loggerLocator.node.js'
import type { BaseLogger, LogContext } from './types/index.js'

/**
 * Request-local payload stored inside {@link AsyncLocalStorage}.
 *
 * @remarks
 * Currently we only persist the scoped logger, but the shape can grow if we need
 * to track additional per-request metadata in the future.
 */
type RequestScope = {
  logger: BaseLogger
}

/**
 * Execution-context storage that propagates the scoped logger across async boundaries.
 */
const storage = new AsyncLocalStorage<RequestScope>()

/**
 * Runs the supplied callback with request-specific bindings merged into the logger context.
 *
 * @param bindings - Optional metadata (requestId, userId, etc.) used to create a child logger.
 * @param run - Function whose async chain should inherit the scoped logger.
 *
 * @remarks
 * - If the parent logger exposes `child`, we derive a child with the provided bindings.
 * - If `bindings` is undefined, the parent logger is reused as-is.
 * - The scoped logger is cleared automatically when `run` completes.
 */
export function withRequestContext<T>(
  bindings: LogContext | undefined,
  run: () => T,
): T
export function withRequestContext<T>(
  bindings: LogContext | undefined,
  run: () => Promise<T>,
): Promise<T>
export function withRequestContext<T>(
  bindings: LogContext | undefined,
  run: () => T | Promise<T>,
) {
  const parent = storage.getStore()?.logger ?? getLogger()
  const scoped =
    typeof parent.child === 'function' && bindings
      ? parent.child({ ...bindings })
      : parent

  return storage.run({ logger: scoped }, () => run())
}

/**
 * Fetch the logger associated with the current async context.
 *
 * @returns The scoped logger when inside a `withRequestContext` call; otherwise the global logger.
 */
export function getRequestLogger(): BaseLogger {
  return storage.getStore()?.logger ?? getLogger()
}
