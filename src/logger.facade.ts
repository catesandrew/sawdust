import { getCanonicalLogger } from './logger.singleton.js'
import type {
  LogContext,
  LoggerImplementation,
  LogLayerTransport,
  LogLevelType,
  MessageDataType,
  RawLogEntry,
} from './types/index.js'

/**
 * Swappable façade that always delegates to the current singleton logger.
 *
 * @remarks
 * Every consumer imports the same façade instance; behind the scenes it forwards
 * calls to whichever logger the singleton currently considers canonical. Builder-like
 * methods (`withContext`, `child`, etc.) chain lazily so they remain aligned with the
 * latest logger even after upgrades.
 */
export class SwappableLogger implements LoggerImplementation {
  /**
   * @param chain - Optional transformer composed on the canonical logger prior to use.
   *
   * @remarks
   * Chains are how derived façades remember builder operations without freezing a
   * specific logger instance. Each new façade created by builder methods wraps an
   * extended chain that replays the operation just-in-time.
   */
  constructor(
    private readonly chain?: (
      logger: LoggerImplementation,
    ) => LoggerImplementation,
  ) {}

  /**
   * Resolve the canonical logger and apply the local chain (if any).
   *
   * @throws When no logger has been installed yet. This should only happen in tests
   *         that have not seeded the pre-init logger.
   */
  private base(): LoggerImplementation {
    const canonical = getCanonicalLogger()
    if (!canonical) {
      throw new Error('Logger not initialized')
    }
    return this.chain ? this.chain(canonical) : canonical
  }

  /**
   * Helper that produces a new façade with an extended chain.
   *
   * @param chain - Function that applies the builder operation to a logger.
   */
  private wrap(
    chain: (logger: LoggerImplementation) => LoggerImplementation,
  ): SwappableLogger {
    return new SwappableLogger((logger) =>
      chain(this.chain ? this.chain(logger) : logger),
    )
  }

  trace(...messages: MessageDataType[]): void
  trace(...messagesAndContext: [...MessageDataType[], LogContext]): void
  trace(...messagesAndError: [...MessageDataType[], Error]): void
  trace(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  /** Delegates trace-level logging to the current canonical logger. */
  trace(...args: Array<MessageDataType | Error | LogContext>): void {
    ;(this.base().trace as (...inner: any[]) => void)(...args)
  }
  debug(...messages: MessageDataType[]): void
  debug(...messagesAndContext: [...MessageDataType[], LogContext]): void
  debug(...messagesAndError: [...MessageDataType[], Error]): void
  debug(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  /** Delegates debug-level logging to the current canonical logger. */
  debug(...args: Array<MessageDataType | Error | LogContext>): void {
    ;(this.base().debug as (...inner: any[]) => void)(...args)
  }
  info(...messages: MessageDataType[]): void
  info(...messagesAndContext: [...MessageDataType[], LogContext]): void
  info(...messagesAndError: [...MessageDataType[], Error]): void
  info(...messagesErrorContext: [...MessageDataType[], Error, LogContext]): void
  /** Delegates info-level logging to the current canonical logger. */
  info(...args: Array<MessageDataType | Error | LogContext>): void {
    ;(this.base().info as (...inner: any[]) => void)(...args)
  }
  warn(...messages: MessageDataType[]): void
  warn(...messagesAndContext: [...MessageDataType[], LogContext]): void
  warn(...messagesAndError: [...MessageDataType[], Error]): void
  warn(...messagesErrorContext: [...MessageDataType[], Error, LogContext]): void
  /** Delegates warn-level logging to the current canonical logger. */
  warn(...args: Array<MessageDataType | Error | LogContext>): void {
    ;(this.base().warn as (...inner: any[]) => void)(...args)
  }
  error(...messages: MessageDataType[]): void
  error(...messagesAndContext: [...MessageDataType[], LogContext]): void
  error(...messagesAndError: [...MessageDataType[], Error]): void
  error(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  /** Delegates error-level logging to the current canonical logger. */
  error(...args: Array<MessageDataType | Error | LogContext>): void {
    ;(this.base().error as (...inner: any[]) => void)(...args)
  }
  fatal(...messages: MessageDataType[]): void
  fatal(...messagesAndContext: [...MessageDataType[], LogContext]): void
  fatal(...messagesAndError: [...MessageDataType[], Error]): void
  fatal(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  /** Delegates fatal-level logging to the current canonical logger. */
  fatal(...args: Array<MessageDataType | Error | LogContext>): void {
    ;(this.base().fatal as (...inner: any[]) => void)(...args)
  }

  /** Compose the façade with `withContext`, replayed against the canonical logger. */
  withContext(ctx: Record<string, any>): LoggerImplementation {
    return this.wrap((logger) => logger.withContext(ctx))
  }
  /** Compose the façade with `withMetadata`, ensuring future calls use latest logger. */
  withMetadata(meta: Record<string, any>): LoggerImplementation {
    return this.wrap((logger) => logger.withMetadata(meta))
  }
  /** Compose the façade with `withError`. */
  withError(err: any): LoggerImplementation {
    return this.wrap((logger) => logger.withError(err))
  }
  /** Compose the façade with `withPrefix`. */
  withPrefix(prefix: string): LoggerImplementation {
    return this.wrap((logger) => logger.withPrefix(prefix))
  }
  /** Compose the façade with `child`. */
  child(options?: LogContext): LoggerImplementation {
    return this.wrap((logger) => logger.child(options))
  }

  /** Delegates metadata-only emission; remains coupled to the canonical logger. */
  metadataOnly(meta: Record<string, any>, level?: LogLevelType): void {
    this.base().metadataOnly(meta, level)
  }
  /** Delegates error-only emission; remains coupled to the canonical logger. */
  errorOnly(
    err: any,
    opts?: { logLevel?: LogLevelType; copyMsg?: boolean },
  ): void {
    this.base().errorOnly(err, opts)
  }

  /** Enables logging on the canonical logger. */
  enableLogging(): void {
    this.base().enableLogging()
  }
  /** Disables logging on the canonical logger. */
  disableLogging(): void {
    this.base().disableLogging()
  }
  /** Sets the log level on the canonical logger. */
  setLevel(level: LogLevelType): void {
    this.base().setLevel(level)
  }
  /** Gets the lowest enabled level reported by the canonical logger. */
  getLevel(): LogLevelType {
    return this.base().getLevel()
  }
  /** Enables an individual log level on the canonical logger. */
  enableIndividualLevel(level: LogLevelType): void {
    this.base().enableIndividualLevel(level)
  }
  /** Disables an individual log level on the canonical logger. */
  disableIndividualLevel(level: LogLevelType): void {
    this.base().disableIndividualLevel(level)
  }
  /** Indicates whether a level is active on the canonical logger. */
  isLevelEnabled(level: LogLevelType): boolean {
    return this.base().isLevelEnabled(level)
  }

  /** Retrieves the current context from the canonical logger. */
  getContext(): Record<string, any> | undefined {
    return this.base().getContext()
  }
  /** Clears the context attached to the canonical logger. */
  clearContext(): void {
    this.base().clearContext()
  }
  /** Mutes context emission on the canonical logger. */
  muteContext(): void {
    this.base().muteContext()
  }
  /** Unmutes context emission on the canonical logger. */
  unMuteContext(): void {
    this.base().unMuteContext()
  }
  /** Mutes metadata emission on the canonical logger. */
  muteMetadata(): void {
    this.base().muteMetadata()
  }
  /** Unmutes metadata emission on the canonical logger. */
  unMuteMetadata(): void {
    this.base().unMuteMetadata()
  }

  /** Emits raw entries through the canonical logger. */
  raw(entry: RawLogEntry): void {
    this.base().raw(entry)
  }

  /**
   * Replace transports on the canonical logger and return a façade pinned to the result.
   *
   * @remarks
   * The returned façade retains swappability by wrapping the derived logger in a new
   * `SwappableLogger`. Consumers should generally prefer configuring transports via
   * `configureLogger`, but this shim supports legacy patterns.
   */
  withFreshTransports(
    transports: LogLayerTransport | LogLayerTransport[],
  ): LoggerImplementation {
    const next = this.base().withFreshTransports(transports)
    return new SwappableLogger(() => next)
  }

  /**
   * Retrieve a transport-specific logger instance (e.g., Consola/Datadog).
   *
   * @remarks
   * Delegates directly so callers see the live transport instances even after swaps.
   */
  getLoggerInstance<Library = unknown>(id: string): Library | undefined {
    return this.base().getLoggerInstance<Library>(id)
  }

  /**
   * Run a function with additional context applied to the canonical logger.
   *
   * @remarks
   * Overloads match `LoggerImplementation`, ensuring parity across environments.
   */
  runWithContext<T>(ctx: Record<string, any>, fn: () => T): T
  runWithContext<T>(ctx: Record<string, any>, fn: () => Promise<T>): Promise<T>
  runWithContext<T>(
    ctx: Record<string, any>,
    fn: () => T | Promise<T>,
  ): T | Promise<T> {
    return this.base().runWithContext(ctx, fn)
  }
}
