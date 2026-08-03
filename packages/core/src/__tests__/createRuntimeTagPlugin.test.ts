import { describe, expect, it } from 'vitest'

import { createRuntimeTagPlugin } from '../createRuntimeTagPlugin.js'

describe('createRuntimeTagPlugin', () => {
  it('prefixes first string message with the provided tag', () => {
    const plugin = createRuntimeTagPlugin('Client')
    const messages = plugin.onBeforeMessageOut?.({
      messages: ['fetching data', { payload: true }],
    } as any)

    expect(messages).toEqual(['[Client] fetching data', { payload: true }])
  })

  it('leaves non-string payloads untouched', () => {
    const plugin = createRuntimeTagPlugin('Server')
    const payload = [{ foo: 'bar' }, 'message']

    expect(
      plugin.onBeforeMessageOut?.({
        messages: payload,
      } as any),
    ).toBe(payload)
  })

  it('leaves empty payloads untouched', () => {
    const plugin = createRuntimeTagPlugin('Server')
    const payload: unknown[] = []
    expect(
      plugin.onBeforeMessageOut?.({
        messages: payload,
      } as any),
    ).toBe(payload)
  })
})
