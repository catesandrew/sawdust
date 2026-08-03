import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
} from '@angular/core'
import type { LoggerImplementation, LoggerOptions } from '@cues/sawdust'
import { configureLogger } from '@cues/sawdust/logger'
import { SAWDUST_LOGGER } from './token.js'

// Angular's PLATFORM_ID resolves to the string 'server' under Angular Universal
// (PLATFORM_SERVER_ID) and 'browser' in the browser (PLATFORM_BROWSER_ID). We
// compare directly rather than importing `isPlatformServer` from '@angular/common'
// to avoid pulling that package's eager PlatformLocation initialization.
const PLATFORM_SERVER = 'server'

/**
 * SSR-safe option resolution: on the server, strip transports and plugins so the
 * façade stays usable but silent (preventing double logging during server render).
 * On the browser the options pass through unchanged.
 *
 * @param options - The caller's logger options.
 * @param isServer - Whether the current platform is the server.
 * @returns The options to configure the logger with for this platform.
 */
export function resolveInitialOptions(
  options: LoggerOptions,
  isServer: boolean,
): LoggerOptions {
  return isServer ? { ...options, transports: {}, plugins: [] } : options
}

/**
 * Provide and configure the Sawdust logger for an Angular application.
 *
 * Add it to a standalone bootstrap or `ApplicationConfig`:
 *
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideSawdustLogger({ transports: { console: { enabled: true } } }),
 *   ],
 * })
 * ```
 *
 * The logger is configured lazily on first injection, honoring the runtime
 * platform (server vs browser) so SSR never double-logs. Provider transports
 * (`@cues/sawdust-datadog`, `@cues/sawdust-otel`) go in `extraTransports` /
 * `plugins` on `options`, exactly as elsewhere.
 *
 * @param options - Logger configuration passed to `configureLogger`.
 * @returns Environment providers exposing {@link SAWDUST_LOGGER}.
 */
export function provideSawdustLogger(
  options: LoggerOptions = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: SAWDUST_LOGGER,
      useFactory: (): LoggerImplementation => {
        const isServer = inject(PLATFORM_ID) === PLATFORM_SERVER
        return configureLogger(resolveInitialOptions(options, isServer), {
          stage: 'final',
          id: isServer ? 'angular:server' : 'angular:browser',
        })
      },
    },
  ])
}
