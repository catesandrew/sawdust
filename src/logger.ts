import type {
  ILogLayer,
  LogLayerPlugin,
  LogLayerTransport,
  MessageDataType,
  RawLogEntry,
} from '@loglayer/shared'
import { LogLayer } from 'loglayer'
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
  readLoggerMeta,
} from './logger.singleton.js'
import { setLogger } from './loggerLocator.js'
import { mergeContext } from './loggerUtils.js'
import { serializeError } from './serializeError.js'
import type {
  BuildTransportsCreatedResult,
  LogContext,
  LoggerImplementation,
  LoggerOptions,
  LogLevelType,
} from './types/index.js'

/**
 * Composes the baseline transport list for this environment (Console only by default).
 */
function buildTransports(
  opts: LoggerOptions,
  {
    logLevel,
  }: {
    logLevel: LogLevelType
  },
): LogLayerTransport[] {
  const out: LogLayerTransport[] = []

  return out
}

/**
 * Environment-agnostic logger implementation used in contexts where only
 * the core Console transport is needed (e.g., tests, simple Node scripts).
 *
 * Mirrors the {@link LogLayer} public API while returning `LoggerImpl` for fluent chaining.
 */
export class LoggerImpl implements LoggerImplementation {
  /** Underlying LogLayer instance responsible for log dispatch. */
  private inner: ILogLayer
  /** Original options preserved for cloning child instances. */
  private readonly opts: LoggerOptions

  /** Logger version reported in payload metadata (default `'1.0.0'`). */
  public get version(): string {
    return this.opts.version ?? '1.0.0'
  }

  /** Deployment environment string (default `'dev'`). */
  public get environment(): string {
    return this.opts.environment ?? 'dev'
  }

  /** Service name attached to log entries (default `'environment-manager-ui'`). */
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

      return
    }

    const plugins: LogLayerPlugin[] = [...(options.plugins ?? [])]

    this.inner = new LogLayer({
      prefix: options.prefix,
      errorSerializer: options.errorSerializer ?? serializeError,
      contextFieldName: options.contextFieldName ?? 'ctx',
      metadataFieldName: options.metadataFieldName ?? 'ctx',
      errorFieldName: options.errorFieldName ?? 'err',
      transport: [],
      plugins,
    })

    this.inner.setLevel(options.defaultLevel || 'info')

    // const baseMetadata = sanitizeRecord({
    //   service: this.service,
    //   environment: this.environment,
    //   ...(options.defaultContext ? options.defaultContext : {}),
    // }) ?? {
    //   service: this.service,
    //   environment: this.environment,
    //   ...(options.defaultContext ? options.defaultContext : {}),
    // }
    // this.inner.withContext(baseMetadata)
  }

  // ----- helpers we add (work the same on web)
  /** Runs a synchronous callback without additional context propagation. */
  runWithContext<T>(ctx: Record<string, any>, fn: () => T): T
  /** Runs an asynchronous callback without additional context propagation. */
  runWithContext<T>(ctx: Record<string, any>, fn: () => Promise<T>): Promise<T>
  /**
   * No-op context helper for environments without AsyncLocalStorage.
   * Simply invokes `fn` with the provided arguments.
   */
  runWithContext<T>(ctx: Record<string, any>, fn: () => T | Promise<T>) {
    // No-op context propagation in this environment: just invoke the function.
    // This preserves the return type (sync or Promise) without side effects.
    return fn()
  }

  // ----- proxy everything to LogLayer (and wrap when a new instance is returned)
  /** Adds contextual metadata to subsequent log entries. */
  withContext(ctx: Record<string, any>): LoggerImplementation {
    this.inner.withContext(ctx)
    return this
  }
  /** Adds structured metadata without altering the context stack. */
  withMetadata(meta: Record<string, any>): LoggerImplementation {
    this.inner.withMetadata(meta)
    return this
  }
  /** Associates an error object with subsequent log entries. */
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

  /** Returns a cloned logger with a new prefix while retaining transports/plugins. */
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
  /** Sets the minimum enabled log level. */
  setLevel(level: LogLevelType) {
    this.inner.setLevel(level)
  }
  /**
   * Returns the lowest enabled log level; defaults to `'fatal'` when everything is disabled.
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
  /** Indicates whether the provided level is currently active. */
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
  /** Temporarily mutes context emission. */
  muteContext() {
    this.inner.muteContext()
  }
  /** Re-enables context emission. */
  unMuteContext() {
    this.inner.unMuteContext()
  }
  /** Temporarily mutes metadata emission. */
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

  /** No-op; transports manage their own external service lifecycle. */
  public initializeExternalServices(): void {
    // no-op: transports manage their own lifecycle
  }

  /** Resolves immediately; transports flush synchronously in this environment. */
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

/** Narrower helper used to discriminate between Logger options and implementations. */
function isLoggerImplementation(
  value: LoggerOptions | LoggerImplementation | undefined,
): value is LoggerImplementation {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<LoggerImplementation>).trace === 'function'
  )
}

const preinitOptions: LoggerOptions = {}
const preinit = new LoggerImpl(preinitOptions)

const { current: canonicalPreinit } = installIfBetter(preinit, {
  id: 'generic:preinit',
  stage: 'preinit',
  features: featuresFromOptions(preinitOptions, 'node'),
  createdAt: Date.now(),
  source: 'logger.ts:preinit',
})
setLogger(canonicalPreinit)

export const logger: LoggerImplementation = new SwappableLogger()

export function configureLogger(
  value?: LoggerOptions | LoggerImplementation,
  hints?: {
    stage?: 'partial' | 'final'
    id?: string
    force?: boolean
    level?: string
  },
): LoggerImplementation {
  if (isLoggerImplementation(value)) {
    const existingMeta = readLoggerMeta(value)
    const meta: LoggerMeta = existingMeta ?? {
      id: hints?.id ?? 'generic:adopted',
      stage: hints?.stage ?? 'final',
      features: { transports: [] },
      createdAt: Date.now(),
      source: 'configureLogger(generic)',
    }
    brandLogger(value, meta)
    const result = adoptLogger(value, meta, { force: !!hints?.force })
    setLogger(result.current)
    return result.current
  }

  const options: LoggerOptions = value ?? {}
  if (!options.defaultLevel) {
    const hinted = hints?.level ?? process.env.LOG_LEVEL
    if (hinted) {
      options.defaultLevel = hinted as LogLevelType
    }
  }
  const candidate = new LoggerImpl(options)
  const meta: LoggerMeta = {
    id: hints?.id ?? (value ? 'generic:configured' : 'generic:default'),
    stage: hints?.stage ?? 'final',
    features: featuresFromOptions(options, 'node'),
    createdAt: Date.now(),
    source: 'configureLogger(generic)',
  }
  const result = installIfBetter(candidate, meta, { force: !!hints?.force })
  if (!result.installed && typeof options.defaultLevel === 'string') {
    result.current.setLevel(options.defaultLevel as LogLevelType)
  }
  setLogger(result.current)
  return result.current
}

export const getCurrentLogger = () => getCanonicalLogger()
export const getCurrentLoggerMeta = () => getCanonicalMeta()
export const loggerIsFinal = () => isFinalConfigured()

export { readLoggerMeta, resetLoggerSingleton } from './logger.singleton.js'
export { getLogger, resetLoggerLocator, setLogger } from './loggerLocator.js'
export { noopLogger } from './loggerNoop.js'
export { getRequestLogger, withRequestContext } from './request-scope.js'
