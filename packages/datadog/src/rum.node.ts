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
 * Construct a new Node-side RUM client starting from the noop implementation.
 *
 * @param options - Optional Datadog configuration applied immediately.
 * @returns A new client instance initialised when configuration is supplied.
 */
export const createRumClient = (options?: DatadogRumOptions): RumClient => {
  const client = createNoopRumClient()
  if (options) {
    client.init(options)
  }
  return client
}

/**
 * Access the canonical Node RUM client, optionally refreshing configuration.
 *
 * @param options - When provided, re-initialises the existing client.
 * @returns The shared RUM client.
 */
export const getRumClient = (options?: DatadogRumOptions): RumClient => {
  const client = getRumInstance()
  if (options) {
    client.init(options)
  }
  return client
}

/**
 * Install a caller-supplied RUM client as the canonical instance.
 *
 * @param client - Implementation to store (e.g., Datadog SDK or test double).
 */
export const setRumClient = (client: RumClient): void => {
  setRumInstance(client)
}

/**
 * LogLayer plugin that forwards error-bearing logs to the RUM client. On the
 * server the default client is a noop, so this is effectively inert unless a
 * custom client is installed via {@link setRumClient}.
 */
export const datadogRumErrorPlugin = (): LogLayerPlugin =>
  makeRumErrorPlugin(getRumClient)

export { resetRumClientLocator }
