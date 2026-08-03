import { describe, expect, it } from 'vitest'

import { AsyncLocalStorageContextManager } from '../AsyncLocalStorageContextManager.js'

describe('AsyncLocalStorageContextManager', () => {
  it('stores and retrieves context snapshots', () => {
    const manager = new AsyncLocalStorageContextManager()
    manager.setContext({ requestId: 'abc' })
    expect(manager.getContext()).toEqual({ requestId: 'abc' })
    expect(manager.hasContextData()).toBe(true)

    manager.setContext(undefined)
    expect(manager.getContext()).toEqual({})
    expect(manager.hasContextData()).toBe(false)
  })

  it('appends context fields incrementally', () => {
    const manager = new AsyncLocalStorageContextManager()
    manager.appendContext({ requestId: 'abc' })
    manager.appendContext({ userId: 'user-1' })
    expect(manager.getContext()).toEqual({ requestId: 'abc', userId: 'user-1' })
  })

  it('shares storage between clones and child managers', () => {
    const manager = new AsyncLocalStorageContextManager()
    manager.setContext({ requestId: 'root' })

    const clone = manager.clone() as AsyncLocalStorageContextManager
    clone.appendContext({ userId: 'user' })

    expect(manager.getContext()).toEqual({ requestId: 'root', userId: 'user' })

    const child = new AsyncLocalStorageContextManager()
    manager.onChildLoggerCreated({
      childContextManager: child,
    } as any)

    child.appendContext({ traceId: 'trace' })
    expect(manager.getContext()).toEqual({
      requestId: 'root',
      userId: 'user',
      traceId: 'trace',
    })
  })
})
