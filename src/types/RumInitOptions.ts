import type { RumInitConfiguration } from '@datadog/browser-rum'
import type { SetOptional, Simplify } from 'type-fest'
import type { RumContext } from './RumContext.js'
import type { RumDebugEvent } from './RumDebugEvent.js'

export type { Site } from '@datadog/browser-rum'

/**
 * Strongly-typed wrapper around the Datadog RUM `init` payload.
 *
 * We alias Datadog's `RumInitConfiguration` but mark `clientToken` and
 * `applicationId` optional so callers can progressively provide credentials
 * without resorting to casts. At runtime the RUM client still verifies their
 * presence before initialising.
 */
export type RumInitOptions = Simplify<
  SetOptional<RumInitConfiguration, 'clientToken' | 'applicationId'>
>

/**
 * Comprehensive configuration bag for the Sawdust RUM client wrapper. Combines
 * our orchestration flags with the underlying Datadog init payload.
 */
export type DatadogRumOptions = {
  /**
   * Optional identifier used when multiple RUM instances might coexist.
   * Currently informational only.
   */
  id?: string

  /**
   * Master switch that toggles RUM on or off. When omitted we decide based on
   * environment (`env=prod|qa|prive`) and `enableInDev`.
   */
  enabled?: boolean

  /**
   * Allows RUM to run in non-production environments such as local development
   * or QA. Useful for debugging but should remain disabled in production by
   * default to avoid noisy data.
   */
  enableInDev?: boolean

  /**
   * Hook invoked for every debug lifecycle event emitted by the RUM client.
   * Handy for troubleshooting initialisation issues without polluting logs.
   */
  onDebug?: (event: RumDebugEvent) => void

  /**
   * Mirrors Datadog's `consoleDebug` flag. When true, rum.js prints diagnostic
   * messages to the browser console.
   */
  consoleDebug?: boolean

  /**
   * Optional view name to apply immediately after initialisation.
   * Equivalent to calling `datadogRum.startView(viewName)`.
   */
  viewName?: string

  /**
   * Complete set of options forwarded to `datadogRum.init`. When omitted we
   * assume the host has already initialised Datadog and only use the wrapper to
   * manage global context, actions, etc.
   */
  init?: RumInitOptions

  /**
   * Global context object applied right after initialisation. Values are
   * sanitised before being set on the Datadog client.
   *
   * @example
   * ```ts
   * getRumClient({
   *   globalContext: { service: 'environment-manager-ui', cluster: 'qa' },
   * })
   * ```
   */
  globalContext?: RumContext
}
