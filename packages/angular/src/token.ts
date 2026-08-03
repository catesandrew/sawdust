import { InjectionToken } from '@angular/core'
import type { LoggerImplementation } from '@cues/sawdust'

/**
 * DI token holding the canonical Sawdust logger for an Angular application.
 *
 * Installed by {@link provideSawdustLogger}; read via {@link injectLogger} or a
 * direct `inject(SAWDUST_LOGGER)`.
 */
export const SAWDUST_LOGGER = new InjectionToken<LoggerImplementation>(
  'sawdust.logger',
)
