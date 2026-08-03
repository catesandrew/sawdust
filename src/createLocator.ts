/**
 * Internal container used to store the singleton value on {@link globalThis}.
 *
 * @remarks
 * Keeping the value under a dedicated object allows us to mutate the box in place
 * without replacing the `globalThis` property, which helps when multiple modules
 * obtain the locator controls at different times.
 */
type LocatorBox<T> = {
  value: T
}

/**
 * Contract returned by {@link createLocator}. Each method manipulates the shared
 * instance stored in the locator's global slot.
 */
export interface LocatorControls<T> {
  /**
   * Resolve the current instance tracked by the locator.
   *
   * @returns The live instance. If the locator has never been set, this will be the default
   * value supplied via {@link createLocator}'s `createDefault`.
   */
  get(): T
  /**
   * Replace the current instance.
   *
   * @param value - New instance to store. Passing `null` or `undefined` resets the locator
   * to the default factory output.
   * @returns The instance that is now tracked.
   */
  set(value: T | null | undefined): T
  /**
   * Reset the locator back to the default instance created by the supplied factory.
   *
   */
  reset(): void
}

/**
 * Create a globally shared service locator backed by {@link globalThis}.
 *
 * @typeParam T - The shape of the instance being tracked (e.g., a logger facade or RUM client).
 * @param options.key - A stable symbol (usually from {@link Symbol.for}) used to index into
 * {@link globalThis}. All bundles that reuse the same symbol will refer to the same storage slot.
 * @param options.createDefault - Factory invoked when the locator needs a fallback instance,
 * such as during initialisation or after {@link LocatorControls.reset}.
 *
 * @example
 * ```ts
 * const controls = createLocator({
 *   key: Symbol.for('sawdust.logger.locator'),
 *   createDefault: () => noopLogger,
 * })
 * controls.set(realLogger)
 * ```
 *
 * @remarks
 * The helper encapsulates the `globalThis` dance so callers only need to wire their own
 * defaults. It deliberately mutates a boxed object rather than replacing the property to survive
 * across module reloads (useful in Jest and dev servers).
 */
export function createLocator<T>({
  key,
  createDefault,
}: {
  key: symbol
  createDefault: () => T
}): LocatorControls<T> {
  const g = globalThis as Record<PropertyKey, unknown>

  const getBox = (): LocatorBox<T> => {
    if (!g[key]) {
      g[key] = { value: createDefault() } satisfies LocatorBox<T>
    }
    return g[key] as LocatorBox<T>
  }

  const get = (): T => getBox().value

  const set = (value: T | null | undefined): T => {
    const box = getBox()
    box.value = value ?? createDefault()
    return box.value
  }

  const reset = (): void => {
    getBox().value = createDefault()
  }

  return { get, set, reset }
}
