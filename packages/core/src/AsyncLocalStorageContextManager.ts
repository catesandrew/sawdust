import { AsyncLocalStorage } from 'node:async_hooks'
import type {
  IContextManager,
  LogLayerContext,
  OnChildLoggerCreatedParams,
} from '@loglayer/shared'

/**
 * Context manager backed by Node's {@link AsyncLocalStorage}.
 *
 * Maintains a per-async-call `LogLayerContext`, enabling log metadata to flow through
 * async operations such as request handlers or background jobs.
 *
 * @example
 * ```ts
 * const ctxManager = new AsyncLocalStorageContextManager()
 * ctxManager.setContext({ requestId: 'abc123' })
 * await ctxManager.appendContext({ userId: 42 })
 * ctxManager.getContext() // => { requestId: 'abc123', userId: 42 }
 * ```
 */
export class AsyncLocalStorageContextManager implements IContextManager {
  /**
   * @param storage Optional shared storage instance. Supplying one lets multiple managers
   * reuse the same async context; otherwise a fresh storage is created.
   */
  constructor(
    private storage = new AsyncLocalStorage<LogLayerContext | undefined>(),
  ) {}

  /**
   * Overwrites the current async scope context.
   *
   * - Passing `undefined` clears any existing context slice.
   * - Non-undefined payloads are shallow-cloned to avoid unintended external mutation.
   *
   * @param context Complete context snapshot for the current async scope.
   */
  public setContext(context?: LogLayerContext): void {
    if (context === undefined) {
      this.storage.enterWith(undefined)
      return
    }
    this.storage.enterWith({ ...context })
  }

  /**
   * Merges new fields into the current async scope context.
   *
   * Handy for incrementally enriching context during a request lifecycle (e.g., adding user info).
   *
   * @param context Partial context to append to the existing store.
   */
  public appendContext(context: Partial<LogLayerContext>): void {
    const current = this.storage.getStore() ?? {}
    this.storage.enterWith({ ...current, ...context })
  }

  /**
   * Returns the current async scope context or an empty object when none exists.
   */
  public getContext(): LogLayerContext {
    return this.storage.getStore() ?? {}
  }

  /**
   * Indicates whether the active async scope has any context data.
   *
   * @returns `true` when at least one key exists; otherwise `false`.
   */
  public hasContextData(): boolean {
    const store = this.storage.getStore()
    return !!store && Object.keys(store).length > 0
  }

  /**
   * Shares the underlying storage with child loggers that use the same manager type.
   *
   * Ensures descendants inherit the same async context propagation pipeline.
   */
  public onChildLoggerCreated({
    childContextManager,
  }: OnChildLoggerCreatedParams): void {
    if (childContextManager instanceof AsyncLocalStorageContextManager) {
      childContextManager.replaceStorage(this.storage)
    }
  }

  /**
   * Creates a shallow clone of this manager that points to the same storage instance.
   */
  public clone(): IContextManager {
    return new AsyncLocalStorageContextManager(this.storage)
  }

  /**
   * Internal helper used to swap the current storage reference with a shared instance.
   */
  private replaceStorage(
    storage: AsyncLocalStorage<LogLayerContext | undefined>,
  ): void {
    this.storage = storage
  }
}
