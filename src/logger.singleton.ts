import { setLogger } from './loggerLocator.js'
import type { LoggerImplementation, LoggerOptions } from './types/index.js'

/**
 * Lifecycle classification for logger instances.
 *
 * @remarks
 * The stage feeds into scoring so that a `final` logger always outranks earlier
 * bootstrap variants unless an explicit `priority` override is provided.
 *
 * - `preinit`: fallback logger instantiated at import time.
 * - `partial`: partially configured logger (e.g., missing Datadog, awaiting env).
 * - `final`: fully configured logger ready for production workloads.
 */
export type LoggerStage = 'preinit' | 'partial' | 'final'

/**
 * Capabilities detected on a logger candidate.
 *
 * @property transports - Normalised list of enabled transport identifiers.
 * @property ddTrace - Signals Datadog trace injection support (Node only).
 *
 * @remarks
 * These heuristics feed the scoring function so richer implementations (Datadog,
 * browser logging, trace injection) outrank bare console-based loggers.
 */
export interface LoggerFeatures {
  transports: string[]
  ddTrace?: boolean
}

/**
 * Metadata recorded for every logger tracked by the singleton.
 *
 * @property id - Optional human-friendly identifier (e.g., `node:final`).
 * @property stage - Lifecycle classification that influences scoring.
 * @property features - Capability fingerprint derived from options.
 * @property createdAt - Epoch timestamp to aid debugging/sequencing.
 * @property source - Module or callsite responsible for installation.
 * @property fingerprint - Optional stable hash for deterministic comparisons.
 * @property priority - Explicit score override when defaults are insufficient.
 */
export interface LoggerMeta {
  id?: string
  stage: LoggerStage
  features: LoggerFeatures
  createdAt: number
  source: string
  fingerprint?: string
  priority?: number
}

/** Symbol used to tattoo loggers that the singleton manages (for adoption checks). */
const BRAND = Symbol.for('app.logger.brand')
/** Symbol key holding the {@link LoggerMeta} copy attached to branded loggers. */
const META = Symbol.for('app.logger.meta')
/** Global symbol that stores the singleton entry on `globalThis`. */
const SINGLETON = Symbol.for('app.logger.singleton')

/**
 * Internal representation of the singleton registry.
 *
 * @property current - Active canonical logger instance.
 * @property meta - Metadata describing the current logger.
 * @property epoch - Monotonic counter for tie-breaking/debugging.
 */
type Entry = {
  current: LoggerImplementation | null
  meta: LoggerMeta | null
  epoch: number
}

/** Options accepted by {@link installIfBetter} to influence replacement semantics. */
type InstallOptions = {
  /** Force the install even if the scoring heuristic would reject the candidate. */
  force?: boolean
}

/** Alias used by local helpers; kept separate for readability. */
type Box = {
  current: LoggerImplementation | null
  meta: LoggerMeta | null
  epoch: number
}

/**
 * Fetch (or lazily create) the global singleton entry.
 *
 * @returns The mutable {@link Entry} object stored on `globalThis`.
 *
 * @example
 * ```ts
 * const box = getBox()
 * console.log(box.meta?.id)
 * ```
 */
function getBox(): Box {
  const g = globalThis as Record<PropertyKey, unknown>
  if (!g[SINGLETON]) {
    g[SINGLETON] = { current: null, meta: null, epoch: 0 } satisfies Entry
  }
  return g[SINGLETON] as Entry
}

/**
 * Tattoo a logger instance with the singleton's brand and metadata snapshot.
 *
 * @param logger - Logger implementation being registered or adopted.
 * @param meta - Metadata to persist alongside the instance.
 * @returns The same logger instance, enabling fluent adoption.
 *
 * @remarks
 * Branding is idempotent—subsequent calls simply refresh the metadata copy.
 */
export function brandLogger<T extends LoggerImplementation>(
  logger: T,
  meta: LoggerMeta,
): T {
  const target = logger as unknown as Record<PropertyKey, unknown>
  target[BRAND] = true
  target[META] = { ...meta }
  return logger
}

/**
 * Inspect a logger (from any module) for singleton metadata.
 *
 * @param logger - Candidate logger instance.
 * @returns The stored {@link LoggerMeta} when branded, otherwise `undefined`.
 *
 * @example
 * ```ts
 * const meta = readLoggerMeta(logger)
 * if (meta?.stage === 'final') { ... }
 * ```
 */
export function readLoggerMeta(logger: unknown): LoggerMeta | undefined {
  if (!logger || typeof logger !== 'object') return undefined
  const meta = (logger as Record<PropertyKey, unknown>)[META]
  return meta ? ({ ...(meta as LoggerMeta) } as LoggerMeta) : undefined
}

/**
 * Compute a relative score for a logger candidate based on metadata.
 *
 * @param meta - Metadata describing the candidate.
 * @returns Numeric score; higher values represent better candidates.
 *
 * @remarks
 * Stages contribute the base scoring floor (`final` > `partial` > `preinit`),
 * while optional transports and trace support add bonuses. Consumers may supply
 * an explicit `priority` to override this heuristic entirely when necessary.
 */
function computeScore(meta: LoggerMeta): number {
  if (typeof meta.priority === 'number') {
    return meta.priority
  }

  const stageBase =
    meta.stage === 'final' ? 100 : meta.stage === 'partial' ? 50 : 10

  const features = meta.features ?? { transports: [] }
  let bonus = 0

  if (features.transports.includes('datadog')) bonus += 25
  if (features.transports.includes('datadogBrowser')) bonus += 25
  if (features.ddTrace) bonus += 15

  if (features.transports.includes('consola')) bonus += 2
  if (features.transports.includes('pretty')) bonus += 1
  if (features.transports.includes('console')) bonus += 1

  return stageBase + bonus
}

/**
 * Determine whether a candidate should replace the current canonical logger.
 *
 * @param next - Metadata for the candidate logger.
 * @param current - Metadata for the existing canonical logger.
 * @returns `true` when the candidate outranks the current logger.
 *
 * @remarks
 * Ties favour the incumbent to avoid churn when two candidates are equivalent.
 */
function isBetter(next: LoggerMeta, current: LoggerMeta | null): boolean {
  if (!current) return true
  const nextScore = computeScore(next)
  const currentScore = computeScore(current)
  if (nextScore > currentScore) return true
  if (nextScore < currentScore) return false
  return false
}

/**
 * Result returned from {@link installIfBetter} summarising the install attempt.
 *
 * @property installed - Indicates whether the candidate replaced the incumbent.
 * @property current - The canonical logger after the attempt.
 * @property meta - Metadata associated with the canonical logger.
 */
export type InstallResult = {
  installed: boolean
  current: LoggerImplementation
  meta: LoggerMeta
}

/**
 * Install a logger candidate if it outranks the current singleton entry.
 *
 * @param candidate - Logger implementation attempting to become canonical.
 * @param meta - Metadata describing the candidate.
 * @param opts - Optional install overrides (e.g., `force`).
 * @returns {@link InstallResult} describing the resulting canonical logger.
 *
 * @example
 * ```ts
 * installIfBetter(logger, { id: 'node:final', stage: 'final', ... })
 * ```
 *
 * @remarks
 * The function brands the candidate and snapshots metadata on success. When
 * rejected (due to lower score and no `force` flag) it returns the incumbent.
 */
export function installIfBetter(
  candidate: LoggerImplementation,
  meta: LoggerMeta,
  opts: InstallOptions = {},
): InstallResult {
  const box = getBox()

  if (!opts.force && !isBetter(meta, box.meta)) {
    // Not an upgrade; keep existing entry.
    const current = box.current ?? candidate
    const existingMeta = box.meta ? { ...box.meta } : { ...meta }
    return {
      installed: false,
      current,
      meta: existingMeta,
    }
  }

  brandLogger(candidate, meta)

  box.current = candidate
  box.meta = { ...meta }
  box.epoch += 1

  return {
    installed: true,
    current: candidate,
    meta: { ...meta },
  }
}

/**
 * Alias that enables external callers to "adopt" a logger using the same checks.
 *
 * @remarks
 * Adoption and installation share the same semantics; the naming clarity helps
 * convey intent at call sites (`adoptLogger(externalLogger, meta)`).
 */
export const adoptLogger = installIfBetter

export function initializeLogger(
  factory: (options: { level: string }) => LoggerImplementation,
  {
    level,
    source = 'initializeLogger',
    stage = 'final',
  }: { level?: string; source?: string; stage?: LoggerStage } = {},
) {
  const targetLevel = (level ?? process.env.LOG_LEVEL ?? 'info') as string
  const logger = factory({ level: targetLevel })
  adoptLogger(logger, {
    id: 'injected',
    stage,
    features: { transports: [] },
    createdAt: Date.now(),
    source,
  })
  setLogger(logger)
  return logger
}

/**
 * Fetch the canonical logger currently stored in the singleton.
 *
 * @returns Logger implementation, or `null` if none has been successfully installed.
 */
export function getCanonicalLogger(): LoggerImplementation | null {
  return getBox().current
}

/**
 * Retrieve metadata for the canonical logger.
 *
 * @returns A shallow copy of {@link LoggerMeta} describing the active logger,
 * or `null` when no logger has been registered yet.
 */
export function getCanonicalMeta(): LoggerMeta | null {
  const meta = getBox().meta
  return meta ? { ...meta } : null
}

/**
 * Convenience helper for callers that only care whether the final logger is in place.
 *
 * @returns `true` if the singleton currently tracks a `final` stage logger.
 */
export function isFinalConfigured(): boolean {
  const meta = getBox().meta
  return !!meta && meta.stage === 'final'
}

/**
 * Reset the singleton—intended for tests or CLI tooling.
 *
 * @remarks
 * Clearing the singleton is **not** recommended in production code since it breaks
 * the façade's guarantees. Use only in controlled environments.
 */
export function resetLoggerSingleton(): void {
  const g = globalThis as Record<PropertyKey, unknown>
  delete g[SINGLETON]
}

/**
 * Derive {@link LoggerFeatures} from a {@link LoggerOptions} configuration.
 *
 * @param opts - Logger configuration to analyse.
 * @param env - Target environment (`'node'` or `'web'`) used for transport filtering.
 * @returns Normalised feature set used for scoring and telemetry.
 *
 * @example
 * ```ts
 * const features = featuresFromOptions(options, 'node')
 * // features.transports might include ['console', 'datadog']
 * ```
 */
export function featuresFromOptions(
  opts: LoggerOptions,
  env: 'node' | 'web',
): LoggerFeatures {
  const transports = opts.transports ?? {}
  const out: string[] = []

  if (transports.pretty?.enabled) out.push('pretty')
  if (transports.console?.enabled) out.push('console')
  if (transports.consola?.enabled) out.push('consola')
  if (env === 'node' && transports.datadog?.enabled) out.push('datadog')
  if (env === 'web' && transports.datadogBrowser?.enabled)
    out.push('datadogBrowser')

  const ddTrace = env === 'node' ? !!opts.datadogTraceInjection?.enabled : false

  return {
    transports: out,
    ddTrace,
  }
}
