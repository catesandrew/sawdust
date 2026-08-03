import type { LoggerImplementation } from '@cues/sawdust'

/**
 * Standardize the dependency-injection fallback: use the injected `logger` when
 * provided, otherwise derive a named child from `root`.
 *
 * @param logger - Optionally injected logger (e.g. from a service input).
 * @param root - The fallback root logger (e.g. from `injectLogger()`).
 * @param bindings - Context bindings for the derived child logger.
 * @returns The injected logger, or `root.child(bindings)`.
 *
 * @example
 * ```ts
 * const storeLogger = withChildLogger(config.logger, rootLogger, { store: 'ViewStore' })
 * ```
 */
export const withChildLogger = (
  logger: LoggerImplementation | undefined,
  root: LoggerImplementation,
  bindings: Record<string, unknown>,
): LoggerImplementation => logger ?? root.child(bindings)
