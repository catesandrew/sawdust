import type { BaseLogger } from './BaseLogger.js'

export interface LoggerLocator {
  /**
   * Register the logger that application code should resolve through {@link getLogger}.
   *
   * Passing `null` or `undefined` resets the locator to the noop implementation.
   *
   * @returns The logger instance that was stored.
   */
  setLogger(logger: BaseLogger | null | undefined): BaseLogger

  /**
   * Resolve the current logger surfaced through the service locator.
   *
   * When no logger has been registered yet, a noop logger is returned so callers can
   * invoke logging APIs safely without additional guards.
   */
  getLogger(): BaseLogger

  /** Resets the logger instance back to the noopLogger. */
  resetLoggerLocator(): void
}
