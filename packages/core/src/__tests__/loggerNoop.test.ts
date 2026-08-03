import { describe, expect, it } from 'vitest'
import { noopLogger } from '../loggerNoop.js'

describe('noopLogger', () => {
  it('exposes no-op methods and stable child', () => {
    expect(typeof noopLogger.info).toBe('function')
    expect(noopLogger.child()).toBe(noopLogger)
  })
})
