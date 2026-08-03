import { describe, expect, it } from 'vitest'
import { provideSawdustLogger, resolveInitialOptions } from '../provide.js'

describe('resolveInitialOptions', () => {
  it('strips transports and plugins on the server', () => {
    const out = resolveInitialOptions(
      {
        prefix: '[app]',
        transports: { console: { enabled: true } },
        plugins: [],
      },
      true,
    )
    expect(out.transports).toEqual({})
    expect(out.plugins).toEqual([])
    expect(out.prefix).toBe('[app]') // non-transport options preserved
  })

  it('passes options through unchanged on the browser', () => {
    const options = { transports: { console: { enabled: true } } }
    expect(resolveInitialOptions(options, false)).toBe(options)
  })
})

describe('provideSawdustLogger', () => {
  it('returns Angular EnvironmentProviders', () => {
    const providers = provideSawdustLogger({ transports: {} })
    // EnvironmentProviders is an opaque object carrying an ɵproviders array.
    expect(providers).toBeTypeOf('object')
    expect(providers).not.toBeNull()
  })
})
