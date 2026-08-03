'use client'
import 'client-only' // build-time guard: error if imported from server code
import { datadogLogs } from '@datadog/browser-logs'
import type { LogLayerPlugin } from '@loglayer/plugin'
import type {
  LogLayerTransport,
  MessageDataType,
  RawLogEntry,
} from '@loglayer/shared'
import { DataDogBrowserLogsTransport } from '@loglayer/transport-datadog-browser-logs'
import { LogLayer } from 'loglayer'
import { createConsolaTransport } from './createConsolaTransport.web.js'
import { createConsoleTransport } from './createConsoleTransport.web.js'
import { createDatadogBrowserLogsTransport } from './createDatadogBrowserLogsTransport.js'
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
import { setLogger } from './loggerLocator.web.js'
import { mergeContext, sanitizeForLogging } from './loggerUtils.js'
import { getRumClient } from './rum.web.js'
import { sanitizeRecord } from './sanitizeRecord.js'
import { serializeError } from './serializeError.js'
import type {
  BuildTransportsCreatedResult,
  BuildTransportsResult,
  ILogLayer,
  LogContext,
  LoggerImplementation,
  LoggerOptions,
  LogLevelType,
} from './types/index.js'

let warnedAboutDatadogConsoleForwarding = false

// Simple per-call context stack for the browser (emulates ALS semantics for runWithContext)
const browserContextStack: Array<Record<string, any>> = []

const browserContextPlugin: LogLayerPlugin = {
  id: 'browser-run-context',
  onBeforeDataOut({ data, context }) {
    const top = browserContextStack.length
      ? browserContextStack[browserContextStack.length - 1]
      : undefined
    if (!top) return data
    const mergedCtx = { ...(context || {}), ...top }
    return { ...(data || {}), ctx: mergedCtx }
  },
}

/**
 * Composes the set of browser-friendly transports based on user-supplied options.
 *
 * Instantiates Pretty, Consola, Console, and Datadog Browser transports when configured.
 * Tracks whether Datadog transport was created so we can initialise browser globals.
 */
function buildTransports(
  opts: LoggerOptions,
  {
    service,
    environment,
    version,
    logLevel,
  }: {
    service: string
    environment: string
    version: string
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
  let consoleMirrorsEnabled = false

  // 1) Simple Pretty Terminal (great for local dev)
  if (t.pretty) {
    const prettyTransport =
      t.pretty &&
      createPrettyTransport(t.pretty, {
        runtime: 'browser',
        logLevel,
      })
    const prettyEnabled = t.pretty.enabled ?? true

    if (prettyTransport) {
      out.push(prettyTransport)
      created.pretty = true
      if (prettyEnabled) {
        consoleMirrorsEnabled = true
      }
    }
  }

  // 2) Consola (browser-compatible)
  if (t.consola) {
    const consolaTransport =
      t.consola &&
      createConsolaTransport(t.consola, {
        service,
        logLevel,
      })
    const consolaEnabled = t.consola.enabled ?? true

    if (consolaTransport) {
      out.push(consolaTransport)
      created.consola = true
      if (consolaEnabled) {
        consoleMirrorsEnabled = true
      }
    }
  }

  // 3) Core Console
  if (t.console) {
    const consoleTransport =
      t.console &&
      createConsoleTransport(t.console, {
        logLevel,
      })
    const consoleEnabled = t.console.enabled ?? true

    if (consoleTransport) {
      out.push(consoleTransport)
      created.console = true
      if (consoleEnabled) {
        consoleMirrorsEnabled = true
      }
    }
  }

  // 4) Datadog Browser Logs (disable Datadog console forwarding when we already mirror locally)
  if (t.datadogBrowser) {
    let datadogOptions = t.datadogBrowser

    if (consoleMirrorsEnabled && t.datadogBrowser.init) {
      datadogOptions = {
        ...t.datadogBrowser,
        init: {
          ...t.datadogBrowser.init,
          forwardConsoleLogs: undefined,
        },
      }

      if (!warnedAboutDatadogConsoleForwarding) {
        console.info(
          '[sawdust] Disabled Datadog console forwarding because pretty/console/consola transports already mirror logs in the browser console.',
        )
        warnedAboutDatadogConsoleForwarding = true
      }
    }

    const datadogBrowserTransport =
      datadogOptions &&
      createDatadogBrowserLogsTransport(datadogOptions, {
        service,
        environment,
        version,
        logLevel,
      })

    if (datadogBrowserTransport) {
      out.push(datadogBrowserTransport)
      created.datadogBrowser = true
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

const hasDatadogBrowserTransport = (arr: LogLayerTransport[]): boolean =>
  arr.some(
    (t) =>
      t instanceof DataDogBrowserLogsTransport ||
      (t as any)?.id === 'datadog-browser',
  )

// - Transports: Consola, basic Console, Simple Pretty Terminal (browser mode),
//   and Datadog Browser Logs (optional; can auto‑init if you pass
//   transports.datadogBrowser.init).
// - runWithContext works like a lightweight AsyncLocalStorage using a stack and
//   a plugin that merges the current "run context" into ctx on each log.
/**
 * Browser runtime implementation of the shared logger contract.
 *
 * Wraps a {@link LogLayer} instance and configures browser-oriented transports,
 * including optional Datadog Browser Logs integrations. Maintains a simple stack
 * to provide `runWithContext` semantics similar to AsyncLocalStorage.
 *
 * ```ts
 * const logger = new LoggerImpl({
 *   service: 'environment-manager-ui',
 *   transports: { console: { enabled: true } },
 * })
 * logger.runWithContext({ correlationId: 'abc' }, () => logger.info('Loaded view'))
 * ```
 */
export class LoggerImpl implements LoggerImplementation {
  /** Underlying LogLayer instance that performs the actual logging. */
  private inner: ILogLayer
  /** Effective options preserved for cloning or child loggers. */
  private readonly opts: LoggerOptions
  /** Tracks whether Datadog Browser Logs were initialised so we can update global context. */
  private datadogBrowserInitialized = false

  private readonly buildTransportsCreatedResult?: BuildTransportsCreatedResult

  /** Returns the configured logger version (default `'1.0.0'`). */
  public get version(): string {
    return this.opts.version ?? '1.0.0'
  }

  /** Returns the configured environment string (default `'dev'`). */
  public get environment(): string {
    return this.opts.environment ?? 'dev'
  }

  /** Returns the configured service identifier (default `'environment-manager-ui'`). */
  public get service(): string {
    return this.opts.service ?? 'environment-manager-ui'
  }

  /**
   * Constructs a new logger or wraps an existing {@link LogLayer} instance.
   *
   * @param options Logger configuration (transports, default level, plugins, etc.).
   * @param existing Optional LogLayer instance used when cloning.
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
        this.datadogBrowserInitialized = childCreated.datadogBrowser
      }

      return
    }

    const { transports, created } = buildTransports(options, {
      service: this.service,
      version: this.version,
      environment: this.environment,
      logLevel: options.defaultLevel ?? 'info',
    })

    this.buildTransportsCreatedResult = created

    // Prefer explicit creation flag; fall back to inspection for resilience
    this.datadogBrowserInitialized =
      created.datadogBrowser || hasDatadogBrowserTransport(transports)

    const plugins: LogLayerPlugin[] = [
      // browserContextPlugin,
      createRuntimeTagPlugin('Client'),
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

    this.inner.setLevel(options.defaultLevel ?? 'info')

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

    if (this.datadogBrowserInitialized) {
      const context = this.getContext()
      if (Object.keys(context || {}).length > 0) {
        datadogLogs.setGlobalContext(sanitizeRecord(context) ?? {})
      }
    }
  }

  // ----- helpers we add (mirrors node)
  /** Runs a synchronous callback with additional browser-context metadata. */
  runWithContext<T>(ctx: Record<string, any>, fn: () => T): T
  /** Runs an asynchronous callback with additional browser-context metadata. */
  runWithContext<T>(ctx: Record<string, any>, fn: () => Promise<T>): Promise<T>
  /**
   * Pushes `ctx` onto a per-call stack so nested log calls merge the context automatically.
   * Acts as a lightweight AsyncLocalStorage analogue for browsers.
   */
  runWithContext<T>(ctx: Record<string, any>, fn: () => T | Promise<T>) {
    browserContextStack.push({ ...(browserContextStack.at(-1) || {}), ...ctx })
    try {
      return fn()
    } finally {
      browserContextStack.pop()
    }
  }

  // ----- proxy everything to LogLayer
  /**
   * Adds contextual metadata to the underlying logger and updates Datadog global context when active.
   */
  withContext(ctx: Record<string, any>): LoggerImplementation {
    this.inner.withContext(ctx)

    if (this.datadogBrowserInitialized) {
      datadogLogs.setGlobalContext(sanitizeRecord(this.getContext()) ?? {})
    }

    return this
  }

  /** Adds structured metadata for subsequent log entries. */
  withMetadata(meta: Record<string, any>): LoggerImplementation {
    this.inner.withMetadata(meta)
    return this
  }
  /** Associates an error with subsequent log entries. */
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
  /** Returns a cloned logger with a new prefix while keeping transports/plugins. */
  withPrefix(prefix: string): LoggerImplementation {
    const next = this.inner.withPrefix(prefix)
    return new LoggerImpl(this.opts, next)
  }
  /** Creates a child logger inheriting options and merging default context. */
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
  /** Disables all logging. */
  disableLogging() {
    this.inner.disableLogging()
  }
  /** Sets the minimum enabled log level. */
  setLevel(level: LogLevelType) {
    this.inner.setLevel(level)
  }
  /**
   * Returns the lowest enabled log level; defaults to `'fatal'` when all levels are disabled.
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
  /** Enables a specific log level. */
  enableIndividualLevel(level: LogLevelType) {
    this.inner.enableIndividualLevel(level)
  }
  /** Disables a specific log level. */
  disableIndividualLevel(level: LogLevelType) {
    this.inner.disableIndividualLevel(level)
  }
  /** Indicates whether the given level is currently enabled. */
  isLevelEnabled(level: LogLevelType) {
    return this.inner.isLevelEnabled(level)
  }
  /** Retrieves the active context object. */
  getContext() {
    return this.inner.getContext()
  }
  /** Clears the active context object. */
  clearContext() {
    this.inner.clearContext()
  }
  /** Temporarily silences context emission. */
  muteContext() {
    this.inner.muteContext()
  }
  /** Re-enables context emission. */
  unMuteContext() {
    this.inner.unMuteContext()
  }
  /** Temporarily silences metadata emission. */
  muteMetadata() {
    this.inner.muteMetadata()
  }
  /** Re-enables metadata emission. */
  unMuteMetadata() {
    this.inner.unMuteMetadata()
  }
  /** Emits a raw log entry without additional processing. */
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

  /** Retrieves a transport-specific logger instance by ID. */
  getLoggerInstance<Library = any>(id: string): Library | undefined {
    return this.inner.getLoggerInstance<Library>(id)
  }

  /** Combines current context with optional overrides for payload formatting. */
  public formatPayload(context?: LogContext): LogContext {
    return mergeContext(this.inner.getContext(), context) ?? {}
  }

  /** Browser implementation has no external services to initialise. */
  public initializeExternalServices(): void {
    // no-op: transports manage their own lifecycle
  }

  /** Resolves immediately; browser transports flush synchronously. */
  public async flush(): Promise<void> {
    return Promise.resolve()
  }

  // ── trace
  /** Emits trace-level logs with optional trailing `Error` and/or context args. */
  public trace(...messages: MessageDataType[]): void
  public trace(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public trace(...messagesAndError: [...MessageDataType[], Error]): void
  public trace(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public trace(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    if (err) {
      this.forwardErrorToRum(err, messages, context)
    }
    const target = this.prepareLogTarget(err, context)
    target.trace(...messages)
  }

  // ── debug
  /** Emits debug-level logs with optional trailing `Error` and/or context args. */
  public debug(...messages: MessageDataType[]): void
  public debug(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public debug(...messagesAndError: [...MessageDataType[], Error]): void
  public debug(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public debug(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    if (err) {
      this.forwardErrorToRum(err, messages, context)
    }
    const target = this.prepareLogTarget(err, context)
    target.debug(...messages)
  }

  // ── info
  /** Emits info-level logs with optional trailing `Error` and/or context args. */
  public info(...messages: MessageDataType[]): void
  public info(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public info(...messagesAndError: [...MessageDataType[], Error]): void
  public info(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public info(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    if (err) {
      this.forwardErrorToRum(err, messages, context)
    }
    const target = this.prepareLogTarget(err, context)
    target.info(...messages)
  }

  // ── warn
  /** Emits warn-level logs with optional trailing `Error` and/or context args. */
  public warn(...messages: MessageDataType[]): void
  public warn(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public warn(...messagesAndError: [...MessageDataType[], Error]): void
  public warn(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public warn(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    if (err) {
      this.forwardErrorToRum(err, messages, context)
    }
    const target = this.prepareLogTarget(err, context)
    target.warn(...messages)
  }

  // ── error
  /** Emits error-level logs with optional trailing `Error` and/or context args. */
  public error(...messages: MessageDataType[]): void
  public error(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public error(...messagesAndError: [...MessageDataType[], Error]): void
  public error(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public error(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    if (err) {
      this.forwardErrorToRum(err, messages, context)
    }
    const target = this.prepareLogTarget(err, context)
    target.error(...messages)
  }

  // ── fatal
  /** Emits fatal-level logs with optional trailing `Error` and/or context args. */
  public fatal(...messages: MessageDataType[]): void
  public fatal(...messagesAndContext: [...MessageDataType[], LogContext]): void
  public fatal(...messagesAndError: [...MessageDataType[], Error]): void
  public fatal(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  public fatal(...args: Array<MessageDataType | Error | LogContext>): void {
    const { messages, err, context } = this.parseArgs(args)
    if (err) {
      this.forwardErrorToRum(err, messages, context)
    }
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

  private forwardErrorToRum(
    err: Error,
    messages: MessageDataType[],
    context?: LogContext,
  ): void {
    try {
      const rum = getRumClient()
      if (!rum?.isEnabled()) {
        return
      }
      rum

      const serializedMessages = messages
        .map((message) => {
          if (typeof message === 'string') {
            return message
          }
          if (
            typeof message === 'number' ||
            typeof message === 'boolean' ||
            typeof message === 'bigint'
          ) {
            return String(message)
          }
          // if (message instanceof Error) {
          //   return `${message.name}: ${message.message}`
          // }
          const sanitized = sanitizeForLogging(message)
          return sanitized
        })
        .filter((value) => value !== undefined)

      const baseContext = sanitizeRecord(context)
      const rumContext: Record<string, unknown> = baseContext
        ? { ...baseContext }
        : {}

      if (serializedMessages.length > 0) {
        rumContext.logMessages = serializedMessages
      }

      if (Object.keys(rumContext).length > 0) {
        rum.addError(err, rumContext as any)
      } else {
        rum.addError(err)
      }
    } catch {
      // RUM forwarding should never block logger output
    }
  }
}

/**
 * Default bootstrap configuration used before consumers supply their own options.
 *
 * @remarks
 * This instance keeps the façade responsive in every runtime (SSR, RSC, client)
 * while the real logger is still being negotiated. The prefix and transports are
 * deliberately minimal so early logs always surface in browser devtools without
 * requiring Datadog, Consola, or Pretty transports that may not be ready yet.
 *
 * @example
 * ```ts
 * logger.info('Booting…') // emits via console even before configureLogger runs
 * ```
 */
const preinitOptions: LoggerOptions = {
  /**
   * Prepends a recognisable marker so early log lines can be distinguished from the
   * fully configured logger output. Helps when investigating bootstrap issues.
   */
  prefix: '[pre-init]',
  transports: {
    /**
     * Always enable the native console transport so log output is visible with zero
     * configuration. Pretty/Datadog transports depend on runtime checks, so we keep
     * them disabled until the real configuration is installed.
     */
    console: { enabled: true },
  },
}

/** Pre-init logger instance seeded into the singleton so façade calls never throw. */
const preinit = new LoggerImpl(preinitOptions)

const { current: canonicalPreinit } = installIfBetter(preinit, {
  id: 'web:preinit',
  stage: 'preinit',
  features: featuresFromOptions(preinitOptions, 'web'),
  createdAt: Date.now(),
  source: 'logger.web.ts:preinit',
})
setLogger(canonicalPreinit)

/**
 * Swappable façade imported by the rest of the application.
 *
 * @remarks
 * It always delegates to the canonical logger stored in the singleton. When a better
 * candidate is installed, the façade seamlessly switches without requiring consumers
 * to re-import anything.
 */
export const logger: LoggerImplementation = new SwappableLogger()

/**
 * Install or upgrade the canonical browser logger for the current runtime.
 *
 * @param options - Concrete transport/settings payload to build the logger with.
 * @param hints - Optional metadata to inform scoring and diagnostics.
 * @param hints.stage - Lifecycle stage of this candidate (`partial` vs `final`). Defaults to `final`.
 * @param hints.id - Human-friendly identifier attached to the instance metadata.
 * @param hints.force - Force the install even if scoring would normally reject it.
 *
 * @returns The logger that remains canonical after the attempted install.
 *
 * @example
 * ```ts
 * configureLogger({
 *   prefix: '[UI]',
 *   transports: {
 *     console: { enabled: true },
 *     datadogBrowser: { enabled: true, options: { forwardErrorsToLogs: true } },
 *   },
 * }, { stage: 'final', id: 'web:final' })
 * ```
 */
export function configureLogger(
  options: LoggerOptions,
  hints?: { stage?: 'partial' | 'final'; id?: string; force?: boolean },
): LoggerImplementation {
  const stage = hints?.stage ?? 'final'
  const candidate = new LoggerImpl(options)
  const meta: LoggerMeta = {
    id: hints?.id ?? 'web:configured',
    stage,
    features: featuresFromOptions(options, 'web'),
    createdAt: Date.now(),
    source: 'configureLogger(web)',
  }
  const result = installIfBetter(candidate, meta, { force: !!hints?.force })
  if (!result.installed && typeof options.defaultLevel === 'string') {
    result.current.setLevel(options.defaultLevel as LogLevelType)
  }
  setLogger(result.current)
  return result.current
}

/**
 * Adopt an externally-created logger as the canonical browser instance.
 *
 * @param external - Logger that was constructed elsewhere (e.g., hydration bridge).
 * @param hints - Optional metadata describing the adoption.
 * @param hints.id - Identifier to record for audit.
 * @param hints.stage - Stage of the adopted logger (`partial` or `final`).
 * @param hints.force - Force adoption even if scoring would prefer the incumbent.
 *
 * @returns The logger that remains canonical after the adoption attempt.
 *
 * @example
 * ```ts
 * // Useful when a framework hands you a ready-made logger instance.
 * adoptExternalLogger(existingLogger, { id: 'next-runtime', stage: 'final' })
 * ```
 */
export function adoptExternalLogger(
  external: LoggerImplementation,
  hints?: { id?: string; stage?: 'partial' | 'final'; force?: boolean },
): LoggerImplementation {
  const meta: LoggerMeta = {
    id: hints?.id ?? 'web:adopted',
    stage: hints?.stage ?? 'final',
    features: { transports: [] },
    createdAt: Date.now(),
    source: 'adoptExternalLogger(web)',
  }
  brandLogger(external, meta)
  const result = adoptLogger(external, meta, { force: !!hints?.force })
  setLogger(result.current)
  return result.current
}

/** Retrieve the current canonical logger (mainly for tests and diagnostics). */
export const getCurrentLogger = () => getCanonicalLogger()

/** Read the metadata associated with the current canonical logger. */
export const getCurrentLoggerMeta = () => getCanonicalMeta()

/** Convenience helper indicating whether the logger has reached the `final` stage. */
export const loggerIsFinal = () => isFinalConfigured()

/**
 * Re-exported helpers to support adoption/introspection flows in tests and tooling.
 *
 * - `readLoggerMeta` lets consumers inspect how a logger was branded.
 * - `resetLoggerSingleton` clears global state between test cases.
 */
export { readLoggerMeta, resetLoggerSingleton } from './logger.singleton.js'
export {
  getLogger,
  resetLoggerLocator,
  setLogger,
} from './loggerLocator.web.js'
export { noopLogger } from './loggerNoop.js'
export { getRequestLogger, withRequestContext } from './request-scope.web.js'
