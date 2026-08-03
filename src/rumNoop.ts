import type {
  DatadogRumOptions,
  RumActionContext,
  RumClient,
  RumContext,
  RumImplementation,
  RumUser,
} from './types/index.js'

/**
 * Minimal `RumImplementation` that safely no-ops every call.
 *
 * @remarks
 * Used as the default instance for the RUM locator so applications can call into the API
 * before Datadog is configured. It still tracks the global context locally so tests can
 * assert on context mutations without talking to the real SDK.
 */
export class NoopRumClient implements RumImplementation {
  /** Internal snapshot of global context mutations. */
  private globalContext: RumContext = {}

  /** Ignore init calls while keeping the signature compatible. */
  public init(_options?: DatadogRumOptions): void {
    // noop
  }

  /** Reset recorded context to its initial empty state. */
  public reset(): void {
    this.globalContext = {}
  }

  /** Always report disabled so callers can guard on `isEnabled()`. */
  public isEnabled(): boolean {
    return false
  }

  /** Drop custom actions silently. */
  public addAction(_name: string, _context?: RumActionContext): void {
    // noop
  }

  /** Drop custom timings silently. */
  public addTiming(_name: string, _value?: number): void {
    // noop
  }

  /** Drop custom errors silently. */
  public addError(_error: unknown, _context?: RumActionContext): void {
    // noop
  }

  /** Skip view tracking. */
  public startView(_name: string, _context?: RumActionContext): void {
    // noop
  }

  /** Skip stop session requests. */
  public stopSession(): void {
    // noop
  }

  /** Ignore view-context mutations. */
  public setViewContext(_context: RumContext): void {
    // noop
  }

  /** Ignore view name updates. */
  public setViewName(_name: string): void {
    // noop
  }

  /** Ignore user assignments. */
  public setUser(_user: RumUser): void {
    // noop
  }

  /** Ignore user clearing. */
  public clearUser(): void {
    // noop
  }

  /** Store a shallow copy of the supplied global context. */
  public setGlobalContext(context: RumContext): void {
    this.globalContext = { ...context }
  }

  /** Return a shallow copy of the tracked global context. */
  public getGlobalContext(): RumContext {
    return { ...this.globalContext }
  }

  /** Record a single attribute inside the in-memory context. */
  public setGlobalAttribute(key: string, value: unknown): void {
    this.globalContext = {
      ...this.globalContext,
      [key]: value,
    }
  }

  /** Remove a single attribute from the in-memory context. */
  public removeGlobalAttribute(key: string): void {
    if (!(key in this.globalContext)) {
      return
    }
    const nextContext = { ...this.globalContext }
    delete nextContext[key]
    this.globalContext = nextContext
  }
}

/** Factory helper used by locators to obtain a noop RUM client. */
export const createNoopRumClient = (): RumClient => new NoopRumClient()
