import type { RumClient } from './RumClient.js'

/**
 * Contract implemented by RUM service locators.
 *
 * @remarks
 * Each runtime (generic, node, web) exposes helpers that satisfy this interface so callers can
 * swap or inspect the shared RUM client without caring about the underlying storage detail.
 */
export interface RumLocator {
  /**
   * Store the canonical RUM client.
   *
   * @param client - Concrete implementation to track. Passing `null`/`undefined` restores the
   * default noop client.
   * @returns The instance that was stored after normalisation.
   */
  setRumClient(client: RumClient | null | undefined): RumClient
  /**
   * Resolve the current RUM client instance.
   *
   * @returns The client tracked by the locator (noop client when none has been set).
   */
  getRumClient(): RumClient
  /**
   * Reset the locator back to the default noop client.
   */
  resetRumClientLocator(): void
}
