import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@loglayer/transport-datadog')

let DataDogTransportMock: vi.Mock
let createDatadogTransport: typeof import('../createDatadogTransport.js')['createDatadogTransport']

beforeAll(async () => {
  const transportModule = await import('@loglayer/transport-datadog')
  DataDogTransportMock = transportModule.DataDogTransport as vi.Mock
  ;({ createDatadogTransport } = await import('../createDatadogTransport.js'))
})

beforeEach(() => {
  DataDogTransportMock.mockClear()
})

describe('createDatadogTransport', () => {
  it('returns undefined when apiKey is missing', () => {
    expect(
      createDatadogTransport({ apiKey: undefined } as any, {
        service: 'svc',
        logLevel: 'info',
      }),
    ).toBeUndefined()
    expect(DataDogTransportMock).not.toHaveBeenCalled()
  })

  it('builds the transport with derived tags and onError hook', () => {
    const onDebug = vi.fn()

    const transport = createDatadogTransport(
      {
        apiKey: 'key',
        enableInDev: true,
        options: {
          ddtags: 'team:platform,region:us-east-1',
          service: 'override',
          sendImmediate: true,
        },
      } as any,
      {
        service: 'env-ui',
        logLevel: 'debug',
        onDebug,
      },
    ) as any

    expect(transport).toBeDefined()
    expect(DataDogTransportMock).toHaveBeenCalledTimes(1)
    const config = DataDogTransportMock.mock.calls[0][0]
    expect(config.enabled).toBe(true)
    expect(config.options.ddClientConf.authMethods.apiKeyAuth).toBe('key')
    expect(config.options.ddtags).toContain('service:env-ui')
    expect(config.options.ddtags).toContain('team:platform')

    const error = new Error('boom')
    config.options.onError(error)
    expect(onDebug).toHaveBeenCalledWith({
      type: 'error',
      batch: [],
      transport: 'server',
      error,
    })
  })
})
