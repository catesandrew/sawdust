/**
 * Shared context shape used across logger transports. Allows any key/value
 * pairs that can be JSON serialised; transports typically sanitise before
 * shipping to external systems. `undefined` represents the absence of context.
 */
export type LogContext = Record<string, unknown> | undefined
