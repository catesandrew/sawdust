import { createLocator } from '@cues/sawdust'
import { createNoopRumClient } from './rumNoop.js'
import type { RumClient, RumLocator } from './types/index.js'

/**
 * Node-specific RUM locator. Bootstraps from the shared symbol used across builds.
 */
const controls = createLocator<RumClient>({
  key: Symbol.for('sawdust.rum.locator.node'),
  createDefault: () => createNoopRumClient(),
})

/** Install the canonical RUM client, defaulting to a noop implementation. */
const setRumClient: RumLocator['setRumClient'] = (client) =>
  controls.set(client ?? createNoopRumClient())

/** Retrieve the canonical RUM client for the current runtime. */
const getRumClient: RumLocator['getRumClient'] = () => controls.get()

/** Reset the locator to a fresh noop client (handy for tests). */
const resetRumClientLocator: RumLocator['resetRumClientLocator'] = () => {
  controls.reset()
}

/** Exported bag of locator helpers mirroring the generic entry. */
export const rumLocator: RumLocator = {
  setRumClient,
  getRumClient,
  resetRumClientLocator,
}

export { getRumClient, resetRumClientLocator, setRumClient }
