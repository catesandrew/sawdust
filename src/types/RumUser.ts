/**
 * Structured user metadata forwarded to Datadog RUM via {@link datadogRum.setUser}.
 *
 * Datadog recognises a small set of well-known keys (`id`, `name`, `email`) for
 * identifying end users in dashboards, but also permits arbitrary custom
 * attributes.  We model that behaviour by exposing optional first-class fields
 * for the standard identifiers and allowing any extra camelCase keys via the
 * index signature.
 *
 * @example
 * ```ts
 * rumClient.setUser({
 *   id: session.userId,
 *   email: session.email,
 *   role: 'admin',
 * })
 * ```
 */
export interface RumUser {
  /**
   * Stable identifier for the current user. Datadog displays this in the user
   * explorer, so prefer an immutable ID rather than an email when available.
   */
  id?: string

  /**
   * Human-readable name for the user. Shown alongside spans/actions in Datadog
   * UI. Leave undefined if not collected.
   */
  name?: string

  /**
   * Contact email captured for the user. Optional; only supply when business
   * requirements allow storing PII in Datadog.
   */
  email?: string

  /**
   * Additional attributes forwarded verbatim to Datadog. Use this to annotate
   * users with custom metadata such as team, role, or feature flag cohort.
   */
  [key: string]: unknown
}
