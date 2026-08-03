import { describe, expect, it } from 'vitest'

import { mergeContext, sanitizeForLogging } from '../loggerUtils.js'

describe('mergeContext', () => {
  it('returns undefined when both contexts are missing', () => {
    expect(mergeContext(undefined, undefined)).toBeUndefined()
  })

  it('returns a shallow clone of the provided context when default context missing', () => {
    const context = { requestId: 'abc', nested: { value: 1 } }
    const result = mergeContext(undefined, context)
    expect(result).toEqual(context)
    expect(result).not.toBe(context)
  })

  it('merges default context with provided overrides', () => {
    const defaultContext = { requestId: 'abc', userId: 'old' }
    const override = { userId: 'new', traceId: 'trace' }
    expect(mergeContext(defaultContext, override)).toEqual({
      requestId: 'abc',
      userId: 'new',
      traceId: 'trace',
    })
  })
})

describe('sanitizeForLogging', () => {
  it('keeps primitives and simple objects intact', () => {
    expect(sanitizeForLogging('message')).toBe('message')
    expect(sanitizeForLogging(123)).toBe(123)
    expect(sanitizeForLogging({ key: 'value' })).toEqual({ key: 'value' })
  })

  it('serializes errors with name, message, optional stack, and cause', () => {
    const error = new Error('boom')
    error.stack = 'stack trace'
    ;(error as Error & { cause?: unknown }).cause = new Error('root')
    expect(sanitizeForLogging(error)).toMatchObject({
      name: 'Error',
      message: 'boom',
      stack: 'stack trace',
      cause: {
        name: 'Error',
        message: 'root',
      },
    })
  })

  it('limits depth and array length when sanitizing', () => {
    const deep = {
      level1: {
        level2: { level3: { level4: { level5: { level6: 'stop' } } } },
      },
    }
    const result = sanitizeForLogging(deep)
    expect(
      (
        ((result as Record<string, any>).level1 as Record<string, any>)
          .level2 as Record<string, any>
      ).level3.level4.level5,
    ).toEqual({
      level6: '[truncated]',
    })

    const longArray = Array.from({ length: 55 }, (_, index) => index)
    expect(sanitizeForLogging(longArray) as number[]).toHaveLength(50)
  })

  it('drops functions and symbols when sanitizing objects', () => {
    const sym = Symbol('secret')
    const sanitized = sanitizeForLogging({
      keep: 'value',
      fn: () => {},
      sym,
    }) as Record<string, unknown>

    expect(sanitized).toEqual({ keep: 'value' })
    expect('fn' in sanitized).toBe(false)
    expect('sym' in sanitized).toBe(false)
  })
})
