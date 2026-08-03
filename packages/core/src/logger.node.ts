import { AsyncLocalStorage } from 'node:async_hooks'
import type { LogLayerPlugin } from '@loglayer/plugin'
import { LogLayer } from 'loglayer'
import { createConsolaTransport } from './createConsolaTransport.node.js'
import { createConsoleTransport } from './createConsoleTransport.node.js'
import { createPrettyTransport } from './createPrettyTransport.js'
import { createRuntimeTagPlugin } from './createRuntimeTagPlugin.js'
import { SwappableLogger } from './logger.facade.js'
import {
  adoptLogger,
  brandLogger,
  featuresFromOptions,
  getCanonicalLogger,
  getCanonicalMeta,
  installIfBetter,
  isFinalConfigured,
  type LoggerMeta,
} from './logger.singleton.js'
import { setLogger } from './loggerLocator.node.js'
import { mergeContext } from './loggerUtils.js'
import { sanitizeRecord } from './sanitizeRecord.js'
import { serializeError } from './serializeError.js'
import type {
  BuildTransportsCreatedResult,
  BuildTransportsResult,
  ILogLayer,
  LogContext,
  LoggerImplementation,
  LoggerOptions,
  LogLayerTransport,
  LogLevelType,
  MessageDataType,
  RawLogEntry,
} from './types/index.js'

// ---- Async context (Node): store request/job-specific context
const asyncLocal = new AsyncLocalStorage<Record<string, any>>()

// Plugin to merge ALS context into the log's context just before it ships
const _asyncContextPlugin: LogLayerPlugin = {
  id: 'als-context',
  onBeforeDataOut({ data, context }) {
    const store = asyncLocal.getStore()
    if (!store || Object.keys(store).length === 0) {
      return data
    }
    // Respect our default "ctx" field placement (set on LogLayer below)
    const mergedCtx = { ...(context || {}), ...store }
    return { ...(data || {}), ctx: mergedCtx }
  },
}

/**
 * Composes the transport list for Node usage based on supplied logger options.
 *
 * Enables Pretty, Consola, and Console transports when configured, then appends
 * any caller-provided `extraTransports` (e.g. Datadog from @cues/sawdust-datadog).
 */
function buildTransports(
  opts: LoggerOptions,
  {
    service,
    logLevel,
  }: {
    service: string
    logLevel: LogLevelType
  },
): BuildTransportsResult {
  const t = opts.transports ?? {}
  const out: LogLayerTransport[] = []
  const created = {
    datadogBrowser: false,
    datadog: false,
    console: false,
    consola: false,
    pretty: false,
    ids: [] as string[],
  }

  // 1) Simple Pretty Terminal (great for local dev)
  if (t.pretty) {
    const prettyTransport =
      t.pretty &&
      createPrettyTransport(t.pretty, {
        runtime: 'node',
        logLevel,
      })

    if (prettyTransport) {
      out.push(prettyTransport)
      created.pretty = true
    }
  }

  // 2) Consola (elegant console)
  if (t.consola) {
    const consolaTransport =
      t.consola &&
      createConsolaTransport(t.consola, {
        service,
        logLevel,
      })

    if (consolaTransport) {
      out.push(consolaTransport)
      created.consola = true
    }
  }

  // 3) Core Console
  if (t.console) {
    const consoleTransport =
      t.console &&
      createConsoleTransport(t.console, {
        logLevel,
      })

    if (consoleTransport) {
      out.push(consoleTransport)
      created.console = true
    }
  }

  if (opts.extraTransports?.length) {
    for (const custom of opts.extraTransports) {
      if (custom) {
        out.push(custom)
      }
    }
  }

  created.ids = out.map((t: any) => t?.id ?? 'unknown')
  return { transports: out, created }
}

// - Async context (ALS) integration via an internal plugin that merges AsyncLocalStorage data into the log context field (ctx) for every entry.
//   Use runWithContext({requestId}, () => { ... }) and any logs inside will include that context automatically.
// - Transports: Consola, basic Console, Simple Pretty Terminal (dev‑friendly).
//   Datadog server logs + APM trace injection are provided via `extraTransports`
//   / `plugins` (see @cues/sawdust-datadog).
/**
 * Node runtime implementation of the shared logger contract.
 *
 * Wraps a {@link LogLayer} instance, wires up Node transports (Console, Consola, Pretty),
 * and exposes AsyncLocalStorage-backed helpers so request-scoped metadata flows automatically.
 *
 * ```ts
 * const logger = new LoggerImpl({
 *   service: 'environment-manager-ui',
 *   transports: { console: { enabled: true } },
 * })
 * logger.runWithContext({ requestId: 'abc' }, () => logger.info('handling request'))
 * ```
 */
export class LoggerImpl implements LoggerImplementation {
  /** Underlying LogLayer instance responsible for dispatching log events. */
  private inner: ILogLayer
  /** Original options kept for cloning/child logger creation. */
  private readonly opts: LoggerOptions

  private readonly buildTransportsCreatedResult?: BuildTransportsCreatedResult

  /**
   * Logger version reported in payload metadata. Defaults to `1.0.0`.
   */
  public get version(): string {
    return this.opts.version ?? '1.0.0'
  }

  /**
   * Deployment environment string. Defaults to `'dev'` when unspecified.
   */
  public get environment(): string {
    return this.opts.environment ?? 'dev'
  }

  /**
   * Service name associated with emitted log entries. Defaults to `'environment-manager-ui'`.
   */
  public get service(): string {
    return this.opts.service ?? 'environment-manager-ui'
  }

  /**
   * Constructs a new logger or wraps an existing {@link LogLayer} instance.
   *
   * @param options Runtime configuration (transports, default level, plugins, etc.).
   * @param existing Optional LogLayer instance used when cloning via child/prefix helpers.
   */
  constructor(
    options: LoggerOptions = {},
    existing?: ILogLayer,
    childCreated?: BuildTransportsCreatedResult,
  ) {
    this.opts = options
    if (existing) {
      this.inner = existing

      if (this.opts.defaultContext) {
        this.inner.withContext(this.opts.defaultContext)
      }

      if (childCreated) {
        this.buildTransportsCreatedResult = childCreated
      }

      return
    }

    const { transports, created } = buildTransports(options, {
      service: this.service,
      logLevel: options.defaultLevel ?? 'info',
    })

    this.buildTransportsCreatedResult = created

    const plugins: LogLayerPlugin[] = [
      // asyncContextPlugin,
      createRuntimeTagPlugin('Server'),
      ...(options.plugins ?? []),
    ]

    this.inner = new LogLayer({
      prefix: options.prefix,
      errorSerializer: options.errorSerializer ?? serializeError,
      contextFieldName: options.contextFieldName ?? 'ctx',
      metadataFieldName: options.metadataFieldName ?? 'ctx',
      errorFieldName: options.errorFieldName ?? 'err',
      transport: transports,
      plugins,
    })

    this.inner.setLevel(options.defaultLevel || 'info')

    const baseMetadata = sanitizeRecord({
      service: this.service,
      environment: this.environment,
      ...(options.defaultContext ? options.defaultContext : {}),
    }) ?? {
      service: this.service,
      environment: this.environment,
      ...(options.defaultContext ? options.defaultContext : {}),
    }
    this.inner.withContext(baseMetadata)

    // const contextManager = new AsyncLocalStorageContextManager()
    // this.inner.withContextManager(contextManager)
  }

  // ----- helpers we add (work the same on web)
  /** Runs a synchronous callback with additional AsyncLocalStorage context. */
  runWithContext<T>(ctx: Record<string, any>, fn: () => T): T
  /** Runs an asynchronous callback with additional AsyncLocalStorage context. */
  runWithContext<T>(ctx: Record<string, any>, fn: () => Promise<T>): Promise<T>
  /**
   * Merges `ctx` into the current AsyncLocalStorage store for the duration of `fn`,
   * so any nested log invocations automatically include the supplied metadata.
   */
  runWithContext<T>(ctx: Record<string, any>, fn: () => T | Promise<T>) {
    return asyncLocal.run(
      { ...(asyncLocal.getStore() || {}), ...ctx },
      fn as any,
    )
  }

  // ----- proxy everything to LogLayer (and wrap when a new instance is returned)
  /** Adds contextual metadata to subsequent log entries (mutates current logger). */
  withContext(ctx: Record<string, any>): LoggerImplementation {
    this.inner.withContext(ctx)
    return this
  }
  /** Adds structured metadata without affecting the context stack. */
  withMetadata(meta: Record<string, any>): LoggerImplementation {
    this.inner.withMetadata(meta)
    return this
  }
  /** Associates an error object with subsequent log emission. */
  withError(err: any): LoggerImplementation {
    this.inner.withError(err)
    return this
  }

  /** Emits metadata-only payloads at an optional level. */
  metadataOnly(meta: Record<string, any>, level?: LogLevelType) {
    this.inner.metadataOnly(meta, level as LogLevelType)
  }
  /** Emits error-only payloads at an optional level. */
  errorOnly(err: any, opts?: { logLevel?: LogLevelType; copyMsg?: boolean }) {
    this.inner.errorOnly(err, opts as any)
  }

  /** Returns a cloned logger with an updated prefix while reusing transports and plugins. */
  withPrefix(prefix: string): LoggerImplementation {
    const next = this.inner.withPrefix(prefix)
    return new LoggerImpl(this.opts, next)
  }

  /** Creates a child logger inheriting options and merged default context. */
  child(context?: LogContext): LoggerImplementation {
    const childDefaultContext =
      mergeContext(this.inner.getContext(), context) ?? {}
    const next = this.inner.child()
    return new LoggerImpl(
      { ...this.opts, defaultContext: childDefaultContext },
      next,
      this.buildTransportsCreatedResult,
    )
  }

  /** Enables all logging levels. */
  enableLogging() {
    this.inner.enableLogging()
  }
  /** Disables all logging output. */
  disableLogging() {
    this.inner.disableLogging()
  }
  /** Sets the minimum enabled level. */
  setLevel(level: LogLevelType) {
    this.inner.setLevel(level)
  }
  /**
   * Returns the lowest level currently enabled. Falls back to `'fatal'` when disabled.
   */
  getLevel(): LogLevelType {
    const levels = [
      'trace',
      'debug',
      'info',
      'warn',
      'error',
      'fatal',
    ] as LogLevelType[]
    for (const lvl of levels) {
      if (this.inner.isLevelEnabled(lvl)) {
        return lvl
      }
    }

    // If everything is disabled (e.g., disableLogging), choose a policy:
    return 'fatal' // or throw / return a sentinel
  }
  /** Enables an individual level without altering others. */
  enableIndividualLevel(level: LogLevelType) {
    this.inner.enableIndividualLevel(level)
  }
  /** Disables an individual level without altering others. */
  disableIndividualLevel(level: LogLevelType) {
    this.inner.disableIndividualLevel(level)
  }
  /** Indicates whether a level is active. */
  isLevelEnabled(level: LogLevelType) {
    return this.inner.isLevelEnabled(level)
  }

  /** Returns the active context object. */
  getContext() {
    return this.inner.getContext()
  }
  /** Clears the active context object. */
  clearContext() {
    this.inner.clearContext()
  }
  /** Temporarily prevents context from being attached to logs. */
  muteContext() {
    this.inner.muteContext()
  }
  /** Re-enables context attachment. */
  unMuteContext() {
    this.inner.unMuteContext()
  }
  /** Temporarily prevents metadata from being attached to logs. */
  muteMetadata() {
    this.inner.muteMetadata()
  }
  /** Re-enables metadata attachment. */
  unMuteMetadata() {
    this.inner.unMuteMetadata()
  }

  /** Emits a raw transport entry without extra processing. */
  raw(entry: RawLogEntry) {
    this.inner.raw(entry)
  }

  /**
   * Replaces transports and returns a new logger wrapping the resulting LogLayer instance.
   */
  withFreshTransports(
    t: LogLayerTransport | LogLayerTransport[],
  ): LoggerImplementation {
    const next = this.inner.withFreshTransports(t)
    return new LoggerImpl(this.opts, next)
  }
  /** Returns a transport-specific logger instance by ID when available. */
  getLoggerInstance<Library = any>(id: string): Library | undefined {
    return this.inner.getLoggerInstance<Library>(id)
  }

  /** Combines current context with optional overrides. */
  public formatPayload(context?: LogContext): LogContext {
    return mergeContext(this.inner.getContext(), context) ?? {}
  }

  /** No-op for Node; transports register themselves. */
  public initializeExternalServices(): void {
    // no-op: transports manage their own lifecycle
  }

  /** Resolves immediately; Node transports flush synchronously. */
  public async flush(): Promise<void> {
    return Promise.resolve()
  }

  // ── trace
  /** Emits trace-level log messages and supports trailing `Error` and/or context objects. */
  public trace(...messages: MessageDataType[]): void
  public trace(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public trace(...messagesAndError: [...MessageDataType[], Error]): void
  public trace(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public trace(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    const target = this.prepareLogTarget(err, context)
    target.trace(...messages)
  }

  // ── debug
  /** Emits debug-level log messages and supports trailing `Error` and/or context objects. */
  public debug(...messages: MessageDataType[]): void
  public debug(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public debug(...messagesAndError: [...MessageDataType[], Error]): void
  public debug(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public debug(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    const target = this.prepareLogTarget(err, context)
    target.debug(...messages)
  }

  // ── info
  /** Emits info-level log messages and supports trailing `Error` and/or context objects. */
  public info(...messages: MessageDataType[]): void
  public info(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public info(...messagesAndError: [...MessageDataType[], Error]): void
  public info(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public info(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    const target = this.prepareLogTarget(err, context)
    target.info(...messages)
  }

  // ── warn
  /** Emits warn-level log messages and supports trailing `Error` and/or context objects. */
  public warn(...messages: MessageDataType[]): void
  public warn(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public warn(...messagesAndError: [...MessageDataType[], Error]): void
  public warn(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public warn(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    const target = this.prepareLogTarget(err, context)
    target.warn(...messages)
  }

  // ── error
  /** Emits error-level log messages and supports trailing `Error` and/or context objects. */
  public error(...messages: MessageDataType[]): void
  public error(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public error(...messagesAndError: [...MessageDataType[], Error]): void
  public error(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public error(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    const target = this.prepareLogTarget(err, context)
    target.error(...messages)
  }

  // ── fatal
  /** Emits fatal-level log messages and supports trailing `Error` and/or context objects. */
  public fatal(...messages: MessageDataType[]): void
  public fatal(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public fatal(...messagesAndError: [...MessageDataType[], Error]): void
  public fatal(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public fatal(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    const target = this.prepareLogTarget(err, context)
    target.fatal(...messages)
  }

  /**
   * Parses variadic logging arguments in the canonical order: messages..., optional `Error`, optional context object.
   */
  private parseArgs(
    args: ReadonlyArray<MessageDataType | Error | LogContext>,
  ): { messages: MessageDataType[]; err?: Error; context?: LogContext } {
    let end = args.length
    let context: LogContext | undefined
    let err: Error | undefined

    // trailing context (if it’s a non-Error object)
    const last = args[end - 1]
    if (
      typeof last === 'object' &&
      last !== null &&
      !Array.isArray(last) &&
      !(last instanceof Error)
    ) {
      context = last as LogContext
      end--
    }

    // optional Error just before context (or as last if no context)
    const maybeErr = args[end - 1]
    if (maybeErr instanceof Error) {
      err = maybeErr
      end--
    }

    const messages = args.slice(0, end) as MessageDataType[]
    return { messages, err, context }
  }

  private prepareLogTarget(err?: Error, context?: LogContext): ILogLayer {
    let target: any = this.inner
    if (err) {
      target = target.withError(err)
    }
    if (context) {
      target = target.withMetadata(context)
    }
    return target
  }
}

/**
 * Minimal bootstrap configuration used before the "real" Node logger is available.
 *
 * @remarks
 * The priority here is to keep logging functional (and human-readable) during the
 * earliest lifecycle stages—before Datadog transports or dd-trace have been wired.
 * We deliberately enable only `console` so messages surface even if transports fail.
 *
 * @example
 * ```ts
 * logger.info('service starting…') // prints via console while configuration loads
 * ```
 */
const preinitOptions: LoggerOptions = {
  /**
   * Prefix applied to all bootstrap log entries; helps spot pre-init messages inside
   * mixed transport streams (Datadog, stdout, etc.) once the final logger takes over.
   */
  prefix: '[pre-init]',
  transports: {
    /**
     * Ensure stdout/stderr captures the bootstrap logs without waiting for more
     * advanced transports. Additional transports (pretty, Datadog) are added later
     * through `configureLogger`.
     */
    console: { enabled: true },
  },
}

/** Logger instance seeded into the singleton so façade calls succeed immediately. */
const preinit = new LoggerImpl(preinitOptions)

const { current: canonicalPreinit } = installIfBetter(preinit, {
  id: 'node:preinit',
  stage: 'preinit',
  features: featuresFromOptions(preinitOptions, 'node'),
  createdAt: Date.now(),
  source: 'logger.node.ts:preinit',
})
setLogger(canonicalPreinit)

/**
 * Swappable façade consumed throughout Node services.
 *
 * @remarks
 * Delegates to whatever logger the singleton currently recognises as canonical,
 * providing zero-downtime upgrades as new instances replace the bootstrap logger.
 */
export const logger: LoggerImplementation = new SwappableLogger()

/**
 * Configure (or upgrade) the canonical Node logger with concrete options.
 *
 * @param options - Transport/level/plugins options to initialise the new logger.
 * @param hints - Optional metadata that informs scoring and audit trails.
 * @param hints.stage - Declares the lifecycle stage (`partial` vs `final`); default `final`.
 * @param hints.id - Human-readable identifier recorded in logger metadata.
 * @param hints.force - Forces replacement even when the incumbent scores higher.
 *
 * @returns The logger that remains canonical after the install attempt.
 *
 * @example
 * ```ts
 * import { datadogTransport, datadogTraceInjectorPlugin } from '@cues/sawdust-datadog'
 * configureLogger({
 *   prefix: '[Server]',
 *   transports: { console: { enabled: true } },
 *   extraTransports: [datadogTransport({ service: 'env-manager', logLevel: 'info', apiKey, options: {} })],
 *   plugins: [datadogTraceInjectorPlugin({ apiKey, tracer: ddTrace.init() })],
 * }, { id: 'node:final', stage: 'final' })
 * ```
 */
export function configureLogger(
  options: LoggerOptions,
  hints?: { stage?: 'partial' | 'final'; id?: string; force?: boolean },
): LoggerImplementation {
  const stage = hints?.stage ?? 'final'
  const candidate = new LoggerImpl(options)
  const meta: LoggerMeta = {
    id: hints?.id ?? 'node:configured',
    stage,
    features: featuresFromOptions(options, 'node'),
    createdAt: Date.now(),
    source: 'configureLogger(node)',
  }
  const result = installIfBetter(candidate, meta, { force: !!hints?.force })
  if (!result.installed && typeof options.defaultLevel === 'string') {
    result.current.setLevel(options.defaultLevel as LogLevelType)
  }
  setLogger(result.current)
  return result.current
}

/**
 * Adopt an externally-created logger (e.g., supplied by host framework) as canonical.
 *
 * @param external - Logger instance that was built elsewhere.
 * @param hints - Optional metadata describing the adoption.
 * @param hints.id - Identifier attached to the singleton metadata for traceability.
 * @param hints.stage - Stage declaration (`partial` or `final`) of the adopted logger.
 * @param hints.force - Forces adoption despite scoring rules (use sparingly).
 *
 * @returns The logger that remains canonical after the adoption.
 *
 * @example
 * ```ts
 * adoptExternalLogger(existingLogger, { id: 'worker-thread', stage: 'partial' })
 * ```
 */
export function adoptExternalLogger(
  external: LoggerImplementation,
  hints?: { id?: string; stage?: 'partial' | 'final'; force?: boolean },
): LoggerImplementation {
  const meta: LoggerMeta = {
    id: hints?.id ?? 'node:adopted',
    stage: hints?.stage ?? 'final',
    features: { transports: [], ddTrace: undefined },
    createdAt: Date.now(),
    source: 'adoptExternalLogger(node)',
  }
  brandLogger(external, meta)
  const result = adoptLogger(external, meta, { force: !!hints?.force })
  setLogger(result.current)
  return result.current
}

/** Accessor primarily for tests/diagnostics to inspect the canonical logger instance. */
export const getCurrentLogger = () => getCanonicalLogger()

/** Retrieve metadata describing the current canonical logger (id, stage, features). */
export const getCurrentLoggerMeta = () => getCanonicalMeta()

/** Convenience helper indicating whether the singleton considers the logger "final". */
export const loggerIsFinal = () => isFinalConfigured()

/**
 * Re-export helpers for adoption flows and test suites:
 *
 * - `readLoggerMeta` reads the metadata branded on a logger instance.
 * - `resetLoggerSingleton` clears global state between isolated scenarios.
 */
export { readLoggerMeta, resetLoggerSingleton } from './logger.singleton.js'
export {
  getLogger,
  resetLoggerLocator,
  setLogger,
} from './loggerLocator.node.js'
export { noopLogger } from './loggerNoop.js'
export { getRequestLogger, withRequestContext } from './request-scope.node.js'
