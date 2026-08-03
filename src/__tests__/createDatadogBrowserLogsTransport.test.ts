import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

vi.mock('@datadog/browser-logs')
vi.mock('@loglayer/transport-datadog-browser-logs')

let datadogLogs: any
let DataDogBrowserLogsTransportMock: vi.Mock
let createDatadogBrowserLogsTransport: typeof import('../createDatadogBrowserLogsTransport.js')['createDatadogBrowserLogsTransport']

beforeAll(async () => {
  datadogLogs = (await import('@datadog/browser-logs')).datadogLogs
  DataDogBrowserLogsTransportMock = (
    await import('@loglayer/transport-datadog-browser-logs')
  ).DataDogBrowserLogsTransport as vi.Mock
  ;({ createDatadogBrowserLogsTransport } = await import(
    '../createDatadogBrowserLogsTransport.js'
  ))
})

beforeEach(() => {
  vi.clearAllMocks()
  datadogLogs.getInitConfiguration.mockReturnValue(null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createDatadogBrowserLogsTransport', () => {
  it('returns undefined when init options are missing', () => {
    expect(
      createDatadogBrowserLogsTransport({ init: undefined } as any, {
        service: 'svc',
        environment: 'dev',
        version: '1.0.0',
        logLevel: 'info',
      }),
    ).toBeUndefined()
    expect(DataDogBrowserLogsTransportMock).not.toHaveBeenCalled()
  })

  it('initializes datadog logs and returns the transport instance', () => {
    const transport = createDatadogBrowserLogsTransport(
      {
        init: {
          clientToken: 'token',
          site: 'datadoghq.eu',
          forwardConsoleLogs: 'all',
        },
        loggerName: 'custom',
        enableInDev: true,
      } as any,
      {
        service: 'env-ui',
        environment: 'prod',
        version: '2.0.0',
        logLevel: 'debug',
      },
    ) as any

    expect(transport).toBeDefined()
    expect(datadogLogs.init).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'env-ui',
        env: 'prod',
        version: '2.0.0',
        forwardConsoleLogs: ['error', 'warn', 'debug', 'info'],
      }),
    )
    expect(datadogLogs.createLogger).toHaveBeenCalledWith('custom')
    expect(DataDogBrowserLogsTransportMock).toHaveBeenCalledWith({
      id: 'datadog-browser',
      enabled: true,
      level: 'debug',
      logger: { mocked: true },
    })
  })

  it('warns when already initialised with different core tags', () => {
    datadogLogs.getInitConfiguration.mockReturnValue({
      service: 'existing',
      env: 'dev',
      version: '1.0.0',
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const transport = createDatadogBrowserLogsTransport(
      {
        init: {
          clientToken: 'token',
          site: 'datadoghq.com',
        },
      } as any,
      {
        service: 'env-ui',
        environment: 'prod',
        version: '2.0.0',
        logLevel: 'info',
      },
    )

    expect(transport).toBeDefined()
    expect(datadogLogs.init).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      '[sawdust] @datadog/browser-logs already initialized; using existing {service,env,version}.',
      {
        current: {
          service: 'existing',
          env: 'dev',
          version: '1.0.0',
        },
        requested: { service: 'env-ui', env: 'prod', version: '2.0.0' },
      },
    )
  })
})
