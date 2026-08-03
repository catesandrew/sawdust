import { sanitizeForLogging } from '@cues/sawdust'
import { datadogRum, type RumInitConfiguration } from '@datadog/browser-rum'
import type { LogLayerPlugin } from '@loglayer/plugin'
import { makeRumErrorPlugin } from './makeRumErrorPlugin.js'
import {
  getRumClient as getRumInstance,
  setRumClient as setRumInstance,
} from './rumLocator.web.js'
import type {
  DatadogRumOptions,
  RumActionContext,
  RumClient,
  RumContext,
  RumDebugEvent,
  RumImplementation,
  RumInitOptions,
  RumUser,
  Site,
} from './types/index.js'

/**
 * Default Datadog site that rum.js will report to when a caller does not explicitly provide one.
 * Matches the public US site (`datadoghq.com`) so we do not accidentally point to the EU/Gov sites.
 */
const DEFAULT_SITE = 'datadoghq.com'

/**
 * Utility guard that detects whether the current runtime is a browser.
 * Datadog RUM only supports browser environments, so the client short-circuits otherwise.
 */
const isBrowser = (): boolean => typeof window !== 'undefined'

/**
 * Normalises the configured environment name into tokens.
 */
const envTokens = (env?: string | null): string[] => {
  if (!env) {
    return []
  }
  return env
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/**
 * Determines whether RUM should auto-enable for managed environments.
 * We intentionally allow only qa/prive auto-enable; dev and others require enableInDev.
 */
const isRumEnabledEnv = (env?: string | null): boolean => {
  const tokens = envTokens(env)
  return tokens.includes('qa') || tokens.includes('prive')
}

/**
 * Sanitises context payloads before shipping them to RUM.
 * Datadog requires JSON-serialisable values, so we reuse the logger sanitiser to prune functions,
 * symbols, and deeply nested data. Returns `undefined` when we cannot produce a safe object.
 */
const sanitizeContext = (
  context?: RumContext,
): Record<string, unknown> | undefined => {
  if (!context) {
    return
  }
  const sanitized = sanitizeForLogging(context)
  if (sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return sanitized as Record<string, unknown>
  }
  return
}

/**
 * Sanitises any arbitrary value (e.g., a single attribute) so it is safe to store in RUM context.
 * Delegates to `sanitizeForLogging` to keep behaviour consistent with the logging stack.
 */
const sanitizeValue = (value: unknown): unknown => sanitizeForLogging(value)

/**
 * Concrete implementation of the shared `RumImplementation` contract backed by `@datadog/browser-rum`.
 *
 * Responsibilities:
 * - Initialise RUM with defensive defaults (site/service/version/env are forwarded from callers).
 * - Expose helper methods (`addError`, `addAction`, etc.) while guarding against calls before init.
 * - Maintain an internal copy of the global context so we can mutate/merge attributes predictably.
 * - Emit optional debug events (`onDebug`) to aid diagnostics without crashing the host app.
 *
 * This class is intentionally browser-only. Server runtimes should use the noop implementation.
 */
class DatadogRumClient implements RumImplementation {
  private enabled = false
  private initialized = false
  private globalContext: RumContext = {}
  private onDebug?: (event: RumDebugEvent) => void

  /**
   * Bootstraps the Datadog RUM SDK using the provided options. Handles repeated initialisation by
   * resetting the existing client before re-applying configuration. The call is skipped entirely
   * when we detect a non-browser runtime, missing credentials, or disabled environments.
   *
   * @example
   * ```ts
   * rumClient.init({
   *   enabled: true,
   *   init: {
   *     clientToken: 'pub...',
   *     applicationId: 'uuid',
   *     service: 'environment-manager-ui',
   *     env: 'prive',
   *   },
   * })
   * ```
   */
  public init(options: DatadogRumOptions = {}): void {
    this.onDebug = options.onDebug ?? this.onDebug

    if (!isBrowser()) {
      this.emitDebug({
        type: 'init',
        status: 'skipped',
        detail: 'not a browser environment',
      })
      this.enabled = false
      this.initialized = false
      return
    }

    const clientToken = options?.init?.clientToken
    const applicationId = options?.init?.applicationId

    if (!clientToken || !applicationId) {
      this.emitDebug({
        type: 'init',
        status: 'skipped',
        detail: 'missing clientToken or applicationId',
      })
      this.enabled = false
      this.initialized = false
      return
    }
    const environment = options?.init?.env
    const enableInDev = options.enableInDev ?? false
    const shouldEnable =
      options.enabled ?? (isRumEnabledEnv(environment) || enableInDev)

    if (!shouldEnable) {
      this.emitDebug({
        type: 'init',
        status: 'skipped',
        detail: 'rum disabled by configuration',
      })
      this.enabled = false
      this.initialized = false
      return
    }

    if (!isRumEnabledEnv(environment) && !enableInDev) {
      this.emitDebug({
        type: 'init',
        status: 'skipped',
        detail: 'environment not allowed for rum',
      })
      this.enabled = false
      this.initialized = false
      return
    }

    if (this.initialized) {
      this.reset()
    }

    const service = options?.init?.service
    const version = options?.init?.version
    const site = options?.init?.site ?? DEFAULT_SITE

    const initConfig: RumInitOptions = {
      clientToken,
      applicationId,
      site: site as Site,
      service,
      env: environment,
      version,
      ...(options.init
        ? {
            ...options.init,
          }
        : {}),
    }

    try {
      if (initConfig.applicationId && initConfig.clientToken) {
        datadogRum.init(initConfig as RumInitConfiguration)
        this.enabled = true
        this.initialized = true
        this.emitDebug({
          type: 'init',
          status: 'success',
          payload: {
            service,
            env: environment,
            site,
          },
        })
      }
    } catch (error) {
      this.enabled = false
      this.initialized = false
      this.emitDebug({
        type: 'init',
        status: 'error',
        error,
        detail: 'datadogRum.init failed',
      })
      return
    }

    if (options.globalContext) {
      this.setGlobalContext(options.globalContext)
    }

    if (options.viewName) {
      this.startView(options.viewName)
    }
  }

  /**
   * Stops the active RUM session (when initialised) and clears the `enabled`/`initialized` flags so
   * subsequent calls must reconfigure the client. Safe to call multiple times.
   */
  public reset(): void {
    if (this.initialized && this.enabled) {
      try {
        datadogRum.stopSession()
      } catch (error) {
        this.emitDebug({
          type: 'session',
          status: 'error',
          error,
          detail: 'failed to stop session during reset',
        })
      }
    }
    this.enabled = false
    this.initialized = false
    this.globalContext = {}
  }

  /**
   * Indicates whether the underlying RUM client has been initialised successfully.
   */
  public isEnabled(): boolean {
    return this.enabled && this.initialized
  }

  /**
   * Adds a Datadog action (custom trace) with optional structured context.
   * The context is sanitised before being forwarded. Calls are ignored when RUM is not active.
   */
  public addAction(name: string, context?: RumActionContext): void {
    if (!this.ensureEnabled('action')) {
      return
    }
    try {
      const sanitized = sanitizeContext(context)
      datadogRum.addAction(name, sanitized)
      this.emitDebug({
        type: 'action',
        status: 'success',
        payload: { name },
      })
    } catch (error) {
      this.emitDebug({
        type: 'action',
        status: 'error',
        error,
        detail: `failed to add action: ${name}`,
      })
    }
  }

  /**
   * Records a custom timing metric. When a numeric value is provided it is forwarded,
   * otherwise Datadog timestamps the call. No-ops when the client is disabled.
   */
  public addTiming(name: string, value?: number): void {
    if (!this.ensureEnabled('timing')) {
      return
    }
    try {
      if (value !== undefined) {
        datadogRum.addTiming(name, value)
      } else {
        datadogRum.addTiming(name)
      }
      this.emitDebug({
        type: 'timing',
        status: 'success',
        payload: { name, value },
      })
    } catch (error) {
      this.emitDebug({
        type: 'timing',
        status: 'error',
        error,
        detail: `failed to add timing: ${name}`,
      })
    }
  }

  /**
   * Pushes an error event to Datadog. Used both by application code and the logger bridge.
   * Context is optional and sanitised before being set on the event.
   */
  public addError(error: unknown, context?: RumActionContext): void {
    if (!this.ensureEnabled('error')) {
      return
    }
    try {
      const sanitized = sanitizeContext(context)
      datadogRum.addError(error, sanitized)
      this.emitDebug({
        type: 'error',
        status: 'success',
      })
    } catch (err) {
      this.emitDebug({
        type: 'error',
        status: 'error',
        error: err,
        detail: 'failed to report error',
      })
    }
  }

  /**
   * Starts or updates the current RUM view. Automatically attaches service/version details when
   * provided, and applies additional context via `setViewContext`.
   */
  public startView(name: string, context?: RumActionContext): void {
    if (!this.ensureEnabled('view')) {
      return
    }
    try {
      const sanitized = sanitizeContext(context)
      if (sanitized) {
        const viewOptions: {
          name?: string
          service?: string
          version?: string
        } = { name }
        if (context && typeof context.service === 'string') {
          viewOptions.service = context.service
        }
        if (context && typeof context.version === 'string') {
          viewOptions.version = context.version
        }

        datadogRum.startView(viewOptions as any)

        const { service, version, ...rest } = sanitized
        if (Object.keys(rest).length > 0) {
          datadogRum.setViewContext(rest as any)
        }
      } else {
        datadogRum.startView(name)
      }
      this.emitDebug({
        type: 'view',
        status: 'success',
        payload: { name },
      })
    } catch (error) {
      this.emitDebug({
        type: 'view',
        status: 'error',
        error,
        detail: `failed to start view: ${name}`,
      })
    }
  }

  /**
   * Attempts to stop the current session. Useful when users sign out or when we need to guarantee
   * a fresh session on the next navigation.
   */
  public stopSession(): void {
    if (!this.ensureEnabled('session')) {
      return
    }
    try {
      datadogRum.stopSession()
      this.emitDebug({
        type: 'session',
        status: 'success',
        detail: 'stopSession',
      })
    } catch (error) {
      this.emitDebug({
        type: 'session',
        status: 'error',
        error,
        detail: 'failed to stop session',
      })
    }
  }

  /**
   * Replaces the view context with a sanitised version of the supplied payload.
   */
  public setViewContext(context: RumContext): void {
    if (!this.ensureEnabled('view')) {
      return
    }
    try {
      const sanitized = sanitizeContext(context) ?? {}
      datadogRum.setViewContext(sanitized as any)
      this.emitDebug({
        type: 'view',
        status: 'success',
        detail: 'setViewContext',
      })
    } catch (error) {
      this.emitDebug({
        type: 'view',
        status: 'error',
        error,
        detail: 'failed to set view context',
      })
    }
  }

  /**
   * Updates the current view name without resetting context.
   */
  public setViewName(name: string): void {
    if (!this.ensureEnabled('view')) {
      return
    }
    try {
      datadogRum.setViewName(name)
      this.emitDebug({
        type: 'view',
        status: 'success',
        detail: `setViewName:${name}`,
      })
    } catch (error) {
      this.emitDebug({
        type: 'view',
        status: 'error',
        error,
        detail: 'failed to set view name',
      })
    }
  }

  /**
   * Associates user metadata with subsequent RUM events. Typical fields include `id`, `email`,
   * and `name`, but arbitrary camelCase keys are accepted.
   */
  public setUser(user: RumUser): void {
    if (!this.ensureEnabled('user')) {
      return
    }
    try {
      const sanitized = sanitizeContext(user as RumContext) ?? {}
      datadogRum.setUser(sanitized)
      this.emitDebug({
        type: 'user',
        status: 'success',
      })
    } catch (error) {
      this.emitDebug({
        type: 'user',
        status: 'error',
        error,
        detail: 'failed to set user',
      })
    }
  }

  /**
   * Removes the current user metadata from RUM so future events are anonymised.
   */
  public clearUser(): void {
    if (!this.ensureEnabled('user')) {
      return
    }
    try {
      datadogRum.clearUser()
      this.emitDebug({
        type: 'user',
        status: 'success',
        detail: 'clearUser',
      })
    } catch (error) {
      this.emitDebug({
        type: 'user',
        status: 'error',
        error,
        detail: 'failed to clear user',
      })
    }
  }

  /**
   * Replaces the RUM global context and stores a copy locally so we can keep the two in sync.
   * Global context is added to every event until removed.
   */
  public setGlobalContext(context: RumContext): void {
    this.globalContext = { ...context }
    if (!this.ensureEnabled('global-context')) {
      return
    }
    try {
      const sanitized = sanitizeContext(context)
      datadogRum.setGlobalContext((sanitized ?? {}) as any)
      this.emitDebug({
        type: 'global-context',
        status: 'success',
        detail: 'setGlobalContext',
      })
    } catch (error) {
      this.emitDebug({
        type: 'global-context',
        status: 'error',
        error,
        detail: 'failed to set global context',
      })
    }
  }

  /**
   * Returns a clone of the cached global context. Useful for debugging and diffing.
   */
  public getGlobalContext(): RumContext {
    return { ...this.globalContext }
  }

  /**
   * Adds or updates a single global attribute. We keep the local cache in sync and sanitise the
   * value before handing it to Datadog.
   */
  public setGlobalAttribute(key: string, value: unknown): void {
    this.globalContext = {
      ...this.globalContext,
      [key]: value,
    }

    if (!this.ensureEnabled('global-context')) {
      return
    }
    try {
      const sanitized = sanitizeValue(value)
      datadogRum.setGlobalContextProperty(key, sanitized as unknown)
      this.emitDebug({
        type: 'global-context',
        status: 'success',
        detail: `setGlobalAttribute:${key}`,
      })
    } catch (error) {
      this.emitDebug({
        type: 'global-context',
        status: 'error',
        error,
        detail: `failed to set global attribute: ${key}`,
      })
    }
  }

  /**
   * Removes a global attribute both from the local cache and the Datadog client.
   */
  public removeGlobalAttribute(key: string): void {
    if (key in this.globalContext) {
      const nextContext = { ...this.globalContext }
      delete nextContext[key]
      this.globalContext = nextContext
    }

    if (!this.ensureEnabled('global-context')) {
      return
    }
    try {
      datadogRum.removeGlobalContextProperty(key)
      this.emitDebug({
        type: 'global-context',
        status: 'success',
        detail: `removeGlobalAttribute:${key}`,
      })
    } catch (error) {
      this.emitDebug({
        type: 'global-context',
        status: 'error',
        error,
        detail: `failed to remove global attribute: ${key}`,
      })
    }
  }

  /**
   * Shared guard that emits a debug event and blocks the call when RUM is not initialised yet.
   * @returns `true` when RUM is ready, otherwise `false`.
   */
  private ensureEnabled(type: RumDebugEvent['type']): boolean {
    if (this.isEnabled()) {
      return true
    }

    this.emitDebug({
      type,
      status: 'skipped',
      detail: 'rum client not initialized',
    })
    return false
  }

  /**
   * Safely broadcasts debug events to the optional `onDebug` callback supplied in `init` options.
   * Exceptions are swallowed to avoid breaking the host app while diagnosing issues.
   */
  private emitDebug(event: RumDebugEvent): void {
    if (this.onDebug) {
      try {
        this.onDebug(event)
      } catch {
        // swallow debug errors
      }
    }
  }
}

/**
 * Factory helper that instantiates a fresh Datadog-backed client and optionally initialises it.
 * Prefer `getRumClient` for shared access.
 */
export const createRumClient = (options?: DatadogRumOptions): RumClient => {
  const client: RumImplementation = new DatadogRumClient()
  if (options) {
    client.init(options)
  }
  return client
}

/**
 * Returns the shared RUM client, creating (and storing) a Datadog-backed instance the first time
 * it is invoked in the browser runtime.
 */
export const getRumClient = (options?: DatadogRumOptions): RumClient => {
  let client = getRumInstance()
  if (!(client instanceof DatadogRumClient)) {
    client = createRumClient(options)
    setRumInstance(client)
    return client
  }

  if (options) {
    client.init(options)
  }

  return client
}

/**
 * Replaces the shared instance with a caller-provided implementation (useful for tests).
 */
export const setRumClient = (client: RumClient): void => {
  setRumInstance(client)
}

/**
 * LogLayer plugin that forwards error-bearing logs to Datadog RUM via
 * `getRumClient().addError`. Opt-in replacement for the former hardcoded
 * browser error-forwarding path; register it through the logger `plugins` seam.
 */
export const datadogRumErrorPlugin = (): LogLayerPlugin =>
  makeRumErrorPlugin(getRumClient)

export { resetRumClientLocator } from './rumLocator.web.js'
