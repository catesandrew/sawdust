import type { LoggerImplementation } from '@cues/sawdust'
import { describe, expect, it, vi } from 'vitest'
import { withChildLogger } from '../di/withChildLogger.js'

const makeLogger = () => {
  const child = vi.fn(
    () => ({ tag: 'child' }) as unknown as LoggerImplementation,
  )
  return { child } as unknown as LoggerImplementation & {
    child: ReturnType<typeof vi.fn>
  }
}

describe('withChildLogger', () => {
  it('returns the injected logger untouched when provided', () => {
    const injected = makeLogger()
    const root = makeLogger()
    expect(withChildLogger(injected, root, { store: 'X' })).toBe(injected)
    expect(root.child).not.toHaveBeenCalled()
  })

  it('derives a named child from root when no logger is injected', () => {
    const root = makeLogger()
    const bindings = { store: 'ViewStore' }
    withChildLogger(undefined, root, bindings)
    expect(root.child).toHaveBeenCalledWith(bindings)
  })
})
