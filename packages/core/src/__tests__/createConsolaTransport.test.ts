import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('consola')
vi.mock('@loglayer/transport-consola')

let createConsola: vi.Mock
let LogTypes: Record<string, { level: number }>
let ConsolaTransportMock: vi.Mock
let createConsolaTransport: typeof import('../createConsolaTransport.node.js')['createConsolaTransport']

beforeAll(async () => {
  const consolaModule = await import('consola')
  createConsola = consolaModule.createConsola as vi.Mock
  LogTypes = consolaModule.LogTypes as Record<string, { level: number }>
  ConsolaTransportMock = (await import('@loglayer/transport-consola'))
    .ConsolaTransport as vi.Mock
  ;({ createConsolaTransport } = await import(
    '../createConsolaTransport.node.js'
  ))
})

beforeEach(() => {
  vi.clearAllMocks()
  LogTypes.debug.level = 5
})

describe('createConsolaTransport', () => {
  it('creates a Consola transport with mapped log level and custom logger', () => {
    const transport = createConsolaTransport(
      {
        enabled: true,
        createOptions: { mock: true },
      } as any,
      {
        service: 'env-ui',
        logLevel: 'debug',
      },
    ) as any

    expect(transport).toBeDefined()
    expect(createConsola).toHaveBeenCalledWith({
      level: 5,
      mock: true,
    })
    expect(ConsolaTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'consola',
        enabled: true,
        level: 'debug',
        logger: { mocked: true },
      }),
    )
  })
})
