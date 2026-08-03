/**
 * Core runtime interface describing the operations exposed by a RUM client.
 * Importing from the shared type so environment-specific implementations stay aligned.
 */
import type { RumClient } from './RumClient.js'

/**
 * Extension of {@link RumClient} used by our concrete implementations.
 *
 * Adds a `reset()` hook to allow environments to fully tear down the
 * instrumentation between reloads (e.g. Next.js hot reloading) or when toggling
 * RUM programmatically.
 */
export interface RumImplementation extends RumClient {
  /**
   * Stops the current RUM session and clears any internal state so a subsequent
   * call to `init` starts from a clean slate.
   */
  reset(): void
}
