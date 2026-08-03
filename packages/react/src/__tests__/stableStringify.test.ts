import { describe, expect, it } from 'vitest'
import { stableStringify } from '../logger/stableStringify.js'

describe('stableStringify', () => {
  it('sorts object keys deterministically regardless of insertion order', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(
      stableStringify({ a: 2, b: 1 }),
    )
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
  })

  it('recurses into nested objects and arrays', () => {
    expect(stableStringify({ z: [{ y: 1, x: 2 }] })).toBe(
      '{"z":[{"x":2,"y":1}]}',
    )
  })

  it('handles primitives and null', () => {
    expect(stableStringify(null)).toBe('null')
    expect(stableStringify(42)).toBe('42')
    expect(stableStringify('hi')).toBe('"hi"')
  })

  it('marks circular references instead of throwing', () => {
    const a: Record<string, unknown> = { name: 'a' }
    a.self = a
    expect(() => stableStringify(a)).not.toThrow()
    expect(stableStringify(a)).toContain('[Circular]')
  })
})
