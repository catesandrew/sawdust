import { beforeAll, describe, expect, it, vi } from 'vitest'

const createConsolaMock = vi.fn(() => ({ mocked: true }))
const ConsolaTransportMock = vi.fn(function Constructor(
  this: any,
  config: any,
) {
  Object.assign(this, config)
})

vi.mock('consola/browser', () => ({
  createConsola: createConsolaMock,
  LogTypes: {
    info: { level: 3 },
    debug: { level: 5 },
  },
}))

vi.mock('@loglayer/transport-consola', () => ({
  ConsolaTransport: ConsolaTransportMock,
}))

let createConsolaTransport: typeof import('../createConsolaTransport.web.js')['createConsolaTransport']

beforeAll(async () => {
  ;({ createConsolaTransport } = await import(
    '../createConsolaTransport.web.js'
  ))
})

describe('createConsolaTransport.web', () => {
  it('creates a Consola transport using mapped log level', () => {
    const transport = createConsolaTransport(
      {
        enabled: true,
        createOptions: { mock: true },
      } as any,
      { service: 'env-ui', logLevel: 'info' } as any,
    ) as any

    expect(createConsolaMock).toHaveBeenCalledWith({ level: 3, mock: true })
    expect(ConsolaTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'consola',
        enabled: true,
        level: 'info',
        logger: { mocked: true },
      }),
    )
    expect(transport.id).toBe('consola')
  })
})
