import { createLocator } from './createLocator.js'
import { createNoopRumClient } from './rumNoop.js'
import type { RumClient, RumLocator } from './types/index.js'

/**
 * Browser-side RUM locator sharing the global symbol with other builds.
 */
const controls = createLocator<RumClient>({
  key: Symbol.for('sawdust.rum.locator.web'),
  createDefault: () => createNoopRumClient(),
})

/** Store the canonical RUM client, or fallback to a noop implementation. */
const setRumClient: RumLocator['setRumClient'] = (client) =>
  controls.set(client ?? createNoopRumClient())

/** Resolve the canonical RUM client for the browser runtime. */
const getRumClient: RumLocator['getRumClient'] = () => controls.get()

/** Reset the locator to a new noop client—useful in tests or storybooks. */
const resetRumClientLocator: RumLocator['resetRumClientLocator'] = () => {
  controls.reset()
}

/** Exported helper bag matching the generic entry for ergonomic imports. */
export const rumLocator: RumLocator = {
  setRumClient,
  getRumClient,
  resetRumClientLocator,
}

export { getRumClient, resetRumClientLocator, setRumClient }
