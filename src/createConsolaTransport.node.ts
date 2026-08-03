import { ConsolaTransport } from '@loglayer/transport-consola'
import { createConsola, LogTypes } from 'consola'
import { JsonAwareConsolaTransport } from './JsonAwareConsolaTransport.js'
import type { ConsolaTransportOptions, LogLevelType } from './types/index.js'

/**
 * Creates a browser-friendly Consola transport configured to mirror LogLayer levels.
 *
 * @param consolaOptions Runtime configuration supplied by consumers:
 * - `id`: Optional transport identifier (`'consola'` by default).
 * - `enabled`: Controls whether messages emit; defaults to `true`.
 * - `createOptions`: Options forwarded to `createConsola` (e.g., custom reporters). Use this to tweak colour, throttling, etc.
 * - `json` (currently unused): legacy flag for the `JsonAwareConsolaTransport`. If you need JSON output, uncomment the alternative implementation below.
 * @param service Human-readable service name used when tagging underlying Consola instances.
 * @param logLevel LogLayer level threshold. Mapped to Consola severity via {@link LOG_LEVEL_TO_CONSOLA};
 *                 defaults to `5` (all levels) when no mapping exists.
 *
 * @returns A `ConsolaTransport` instance (always truthy with the current implementation). Return type is kept optional to match other factory signatures.
 *
 * @example
 * ```ts
 * const consolaTransport = createConsolaTransport(
 *   { enabled: true, createOptions: { reporters: new BrowserReporter() } },
 *   { service: 'environment-manager-ui', logLevel: 'info' },
 * )
 * ```
 * Produces a transport that writes info-and-above messages through Consola with custom reporters.
 */
export const createConsolaTransport = (
  consolaOptions: ConsolaTransportOptions,
  {
    service,
    logLevel,
  }: {
    service: string
    logLevel: LogLevelType
  },
): ConsolaTransport | undefined => {
  // return new JsonAwareConsolaTransport(consolaOptions.json ?? true, {
  //   id: consolaOptions.id ?? 'consola',
  //   enabled: consolaOptions?.enabled ?? true,
  //   level: logLevel,
  //   logger: consola.withTag(service),
  // })

  return new ConsolaTransport({
    id: consolaOptions.id ?? 'consola',
    enabled: consolaOptions?.enabled ?? true,
    level: logLevel,
    logger: createConsola({
      level: LogTypes[logLevel].level,
      ...(consolaOptions.createOptions ?? {}),
    }),
  })
}
