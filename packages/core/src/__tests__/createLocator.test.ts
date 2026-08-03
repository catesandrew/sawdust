import { describe, expect, it } from 'vitest'

import { createLocator } from '../createLocator.js'

describe('createLocator', () => {
  it('creates a shared slot on globalThis keyed by the provided symbol', () => {
    const key = Symbol('test.locator')
    const locator = createLocator<string>({
      key,
      createDefault: () => 'default',
    })

    expect(locator.get()).toBe('default')

    locator.set('custom')
    expect(locator.get()).toBe('custom')

    locator.reset()
    expect(locator.get()).toBe('default')

    const secondLocator = createLocator<string>({
      key,
      createDefault: () => 'default',
    })
    expect(secondLocator.get()).toBe('default')
  })

  it('falls back to default when falsy values are set', () => {
    const key = Symbol('test.locator.reset')
    const locator = createLocator<number | null>({
      key,
      createDefault: () => 42,
    })

    locator.set(null)
    expect(locator.get()).toBe(42)

    locator.set(undefined)
    expect(locator.get()).toBe(42)
  })
})
