import { describe, expect, it } from 'vitest'

import { createNoopRumClient, NoopRumClient } from '../rumNoop.js'

describe('NoopRumClient', () => {
  it('tracks global context locally while no-opping API methods', () => {
    const client = new NoopRumClient()
    expect(client.isEnabled()).toBe(false)

    client.setGlobalContext({ requestId: 'abc' })
    expect(client.getGlobalContext()).toEqual({ requestId: 'abc' })

    client.setGlobalAttribute('userId', 'user-1')
    expect(client.getGlobalContext()).toEqual({
      requestId: 'abc',
      userId: 'user-1',
    })

    client.removeGlobalAttribute('requestId')
    expect(client.getGlobalContext()).toEqual({ userId: 'user-1' })

    client.reset()
    expect(client.getGlobalContext()).toEqual({})
  })

  it('factory helper returns a fresh noop client', () => {
    const client = createNoopRumClient()
    expect(client).toBeInstanceOf(NoopRumClient)
  })
})
