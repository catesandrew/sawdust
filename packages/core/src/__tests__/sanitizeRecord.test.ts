import { describe, expect, it } from 'vitest'

import { sanitizeRecord } from '../sanitizeRecord.js'

describe('sanitizeRecord', () => {
  it('returns undefined for falsy values', () => {
    expect(sanitizeRecord()).toBeUndefined()
    expect(sanitizeRecord(null as unknown as any)).toBeUndefined()
  })

  it('returns undefined for non-object-like values', () => {
    expect(sanitizeRecord('string' as any)).toBeUndefined()
    expect(sanitizeRecord(['array'] as any)).toBeUndefined()
  })

  it('sanitizes nested objects while removing unsupported entries', () => {
    const input = {
      requestId: 'abc',
      meta: {
        nested: true,
        fn: () => 'drop',
      },
      symbolKey: Symbol('skip'),
    } as Record<string, unknown>

    const result = sanitizeRecord(input)

    expect(result).toEqual({
      requestId: 'abc',
      meta: { nested: true },
    })
    expect(result).not.toBe(input)
  })
})
