import type { LogLayerPlugin } from '@loglayer/plugin'
import { makeRumErrorPlugin } from './makeRumErrorPlugin.js'
import {
  getRumClient as getRumInstance,
  resetRumClientLocator,
  setRumClient as setRumInstance,
} from './rumLocator.js'
import { createNoopRumClient } from './rumNoop.js'
import type { DatadogRumOptions, RumClient } from './types/index.js'

/**
 * Create a fresh RUM client using the noop implementation as a baseline.
 *
 * @param options - Optional Datadog configuration applied immediately via `init`.
 * @returns A newly constructed client (noop by default, initialised when options are provided).
 */
export const createRumClient = (options?: DatadogRumOptions): RumClient => {
  const client = createNoopRumClient()
  if (options) {
    client.init(options)
  }
  return client
}

/**
 * Retrieve the shared RUM client from the locator, optionally reinitialising it.
 *
 * @param options - When supplied, re-runs `init` on the existing client.
 * @returns The canonical RUM client.
 */
export const getRumClient = (options?: DatadogRumOptions): RumClient => {
  const client = getRumInstance()
  if (options) {
    client.init(options)
  }
  return client
}

/**
 * Replace the locator's RUM client with a caller-provided implementation.
 *
 * @param client - Concrete RUM client (e.g., from Datadog or a test double).
 */
export const setRumClient = (client: RumClient): void => {
  setRumInstance(client)
}

/**
 * LogLayer plugin that forwards error-bearing logs to the shared RUM client.
 * Uses the noop client by default; install a concrete client via
 * {@link setRumClient} to activate forwarding.
 */
export const datadogRumErrorPlugin = (): LogLayerPlugin =>
  makeRumErrorPlugin(getRumClient)

export type {
  DatadogRumOptions,
  RumActionContext,
  RumClient,
  RumContext,
  RumDebugEvent,
  RumImplementation,
  RumInitOptions,
  RumLocator,
  RumUser,
  Site,
} from './types/index.js'
export { resetRumClientLocator }
