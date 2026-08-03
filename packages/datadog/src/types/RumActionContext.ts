import type { RumContext } from './RumContext.js'

/**
 * Alias for the metadata attached to individual RUM actions. We reuse the base
 * {@link RumContext} type so callers can pass arbitrary JSON-serialisable
 * fields describing the action (e.g., `component`, `requestId`).
 */
export type RumActionContext = RumContext
