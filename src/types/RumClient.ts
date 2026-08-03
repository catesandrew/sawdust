import type { RumActionContext } from './RumActionContext.js'
import type { RumContext } from './RumContext.js'
import type { DatadogRumOptions } from './RumInitOptions.js'
import type { RumUser } from './RumUser.js'

/**
 * Contract implemented by browser RUM clients. Mirrors the subset of Datadog's
 * API we rely on while allowing custom implementations (e.g., noop clients).
 */
export interface RumClient {
  /** Initialise the underlying Datadog client. Safe to call multiple times. */
  init(options?: DatadogRumOptions): void
  /** Indicates whether instrumentation is active. */
  isEnabled(): boolean
  /** Record a custom RUM action with optional structured context. */
  addAction(name: string, context?: RumActionContext): void
  /** Report custom timing metrics (e.g., background job durations). */
  addTiming(name: string, value?: number): void
  /** Send error events (Exceptions) with optional context. */
  addError(error: unknown, context?: RumActionContext): void
  /** Start or update the current view. */
  startView(name: string, context?: RumActionContext): void
  /** Stop the active RUM session. */
  stopSession(): void
  /** Replace the view-level context with the provided object. */
  setViewContext(context: RumContext): void
  /** Update the current view name without altering context. */
  setViewName(name: string): void
  /** Associate user metadata with forthcoming events. */
  setUser(user: RumUser): void
  /** Remove user metadata from the session. */
  clearUser(): void
  /** Replace the global context shared across all events. */
  setGlobalContext(context: RumContext): void
  /** Read the current global context snapshot. */
  getGlobalContext(): RumContext
  /** Add or update a single global attribute. */
  setGlobalAttribute(key: string, value: unknown): void
  /** Remove a global attribute by key. */
  removeGlobalAttribute(key: string): void
}
