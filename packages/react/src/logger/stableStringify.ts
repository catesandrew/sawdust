/**
 * Converts a value to a deterministic JSON string with recursively sorted object
 * keys, so the same logical value always yields the same string regardless of key
 * insertion order. Circular references are marked `"[Circular]"`.
 *
 * Inlined into `@cues/sawdust-react` (no external dependency) — used by
 * {@link useLogger} to memoize child loggers on their context.
 *
 * @param obj - Any JSON-serializable value (primitive, array, object, or null).
 * @returns A stable JSON string with object keys sorted at every level.
 */
export function stableStringify(obj: unknown): string {
  const seen = new WeakSet()
  const stringify = (value: any): string => {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value)
    }
    if (seen.has(value)) {
      return '"[Circular]"'
    }
    seen.add(value)
    if (Array.isArray(value)) {
      return `[${value.map((v) => stringify(v)).join(',')}]`
    }
    const keys = Object.keys(value).sort()
    const parts = keys.map((k) => `${JSON.stringify(k)}:${stringify(value[k])}`)
    return `{${parts.join(',')}}`
  }

  return stringify(obj)
}
