import { createLocator } from '@cues/sawdust'
import { createNoopRumClient } from './rumNoop.js'
import type { RumClient, RumLocator } from './types/index.js'

/**
 * Shared locator controls for RUM clients across all environments.
 *
 * @remarks
 * The symbol ensures every bundle (browser, node, or generic) references the same slot on
 * {@link globalThis}. The default value is a noop client so calls remain safe before the
 * real Datadog client is configured.
 */
const controls = createLocator<RumClient>({
  key: Symbol.for('sawdust.rum.locator'),
  createDefault: () => createNoopRumClient(),
})

/** Store the canonical RUM client, falling back to a noop client when undefined. */
const setRumClient: RumLocator['setRumClient'] = (client) =>
  controls.set(client ?? createNoopRumClient())

/** Retrieve the canonical RUM client from the locator. */
const getRumClient: RumLocator['getRumClient'] = () => controls.get()

/** Reset the locator back to a freshly created noop client. */
const resetRumClientLocator: RumLocator['resetRumClientLocator'] = () => {
  controls.reset()
}

/** Convenience export containing the locator helpers. */
export const rumLocator: RumLocator = {
  setRumClient,
  getRumClient,
  resetRumClientLocator,
}

export { getRumClient, resetRumClientLocator, setRumClient }
