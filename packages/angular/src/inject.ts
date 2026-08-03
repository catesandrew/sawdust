import { inject } from '@angular/core'
import type { LoggerImplementation } from '@cues/sawdust'
import { SAWDUST_LOGGER } from './token.js'

/**
 * Inject the Sawdust logger, optionally bound to a component.
 *
 * With a `componentName` it returns a child logger bound to
 * `{ component, ...componentContext }`. Must run in an Angular injection context
 * (a constructor or a field initializer).
 *
 * @param componentName - Optional component label added as `component`.
 * @param componentContext - Optional extra bindings merged into the child logger.
 * @returns The canonical logger, or a child logger when a name is given.
 *
 * @example
 * ```ts
 * export class BatchTableComponent {
 *   private readonly log = injectLogger('BatchTable', { store: 'batches' })
 * }
 * ```
 */
export function injectLogger(
  componentName?: string,
  componentContext?: Record<string, unknown>,
): LoggerImplementation {
  const logger = inject(SAWDUST_LOGGER)
  if (!componentName) {
    return logger
  }
  return logger.child({ component: componentName, ...(componentContext ?? {}) })
}
