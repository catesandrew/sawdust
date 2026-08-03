import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('client-only', () => ({}))

const ConsoleTransportMock = vi.fn(function Constructor(
  this: any,
  config: any,
) {
  Object.assign(this, config)
})

vi.mock('loglayer', () => ({
  ConsoleTransport: ConsoleTransportMock,
}))

let createConsoleTransport: typeof import('../createConsoleTransport.web.js')['createConsoleTransport']

beforeAll(async () => {
  ;({ createConsoleTransport } = await import(
    '../createConsoleTransport.web.js'
  ))
})

describe('createConsoleTransport.web', () => {
  it('creates a ConsoleTransport with merged options', () => {
    const transport = createConsoleTransport(
      {
        id: 'custom',
        enabled: false,
        messageField: 'message',
        appendObjectData: true,
        level: 'warn',
      } as any,
      { logLevel: 'info' } as any,
    ) as any

    expect(ConsoleTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'custom',
        enabled: false,
        logger: console,
        messageField: 'message',
        appendObjectData: true,
        level: 'warn',
      }),
    )
    expect(transport.id).toBe('custom')
  })
})
