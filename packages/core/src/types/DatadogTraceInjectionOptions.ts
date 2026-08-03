import type { Tracer } from 'dd-trace'

/**
 * Configuration options for enabling Datadog APM trace injection.
 *
 * Applied only in Node environments where `dd-trace` is available.
 */
export interface DatadogTraceInjectionOptions {
  /**
   * When `true`, installs the Datadog trace injector plugin.
   * Defaults to `true` when a tracer is supplied.
   */
  enabled?: boolean
  /**
   * Instance of the `dd-trace` tracer.
   * Required when trace injection is enabled.
   */
  tracer?: Tracer
  /**
   * Optional callback invoked when the injector encounters an error.
   *
   * @param err Error thrown by the injector.
   * @param data Optional context payload provided by the plugin.
   */
  onError?(err: Error, data?: Record<string, any>): void
}
