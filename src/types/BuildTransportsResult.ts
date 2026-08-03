import type { LogLayerTransport } from './LogLayer.js'

/**
 * Flags representing which transports were instantiated by the builder.
 * Useful for analytics and follow-up configuration (e.g., enabling RUM).
 */
export type BuildTransportsCreatedResult = {
  /** Whether the browser Datadog transport was created. */
  datadogBrowser: boolean
  /** Whether the server Datadog transport was created. */
  datadog: boolean
  /** Whether Consola transport was created. */
  consola: boolean
  /** Whether the standard console transport was created. */
  console: boolean
  /** Whether the pretty-print transport was created. */
  pretty: boolean
  /** List of transport identifiers for reference/debug logging. */
  ids: string[]
}

/**
 * Outcome of `buildTransports`, pairing the concrete transport instances with
 * metadata describing which ones were created.
 */
export type BuildTransportsResult = {
  transports: LogLayerTransport[]
  created: BuildTransportsCreatedResult
}
