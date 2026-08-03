import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@loglayer/plugin-datadog-apm-trace-injector')

let pluginFactory: vi.Mock
let createDatadogTraceInjectorPlugin: typeof import('../createDatadogTraceInjectorPlugin.js')['createDatadogTraceInjectorPlugin']

beforeAll(async () => {
  pluginFactory = (await import('@loglayer/plugin-datadog-apm-trace-injector'))
    .datadogTraceInjectorPlugin as vi.Mock
  pluginFactory.mockImplementation((config) => config)
  ;({ createDatadogTraceInjectorPlugin } = await import(
    '../createDatadogTraceInjectorPlugin.js'
  ))
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createDatadogTraceInjectorPlugin', () => {
  it('returns undefined when apiKey or tracer are missing', () => {
    expect(
      createDatadogTraceInjectorPlugin(
        { apiKey: undefined } as any,
        { tracer: {} as any },
        { environment: 'prod', service: 'svc' },
      ),
    ).toBeUndefined()

    expect(
      createDatadogTraceInjectorPlugin(
        { apiKey: 'key' } as any,
        { tracer: undefined } as any,
        {
          environment: 'prod',
          service: 'svc',
        },
      ),
    ).toBeUndefined()
  })

  it('forwards tracer and enabled flag to the plugin factory', () => {
    const tracer = {}
    createDatadogTraceInjectorPlugin(
      { apiKey: 'key' } as any,
      { tracer, enabled: false } as any,
      {
        environment: 'prod',
        service: 'svc',
      },
    )

    expect(pluginFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        tracerInstance: tracer,
        disabled: true,
      }),
    )
  })

  it('wraps onError when transport-level handler is provided', () => {
    const tracer = {}
    const onDebug = vi.fn()

    createDatadogTraceInjectorPlugin(
      { apiKey: 'key' } as any,
      { tracer } as any,
      {
        environment: 'prod',
        service: 'svc',
        onError: onDebug,
      },
    )

    const config = pluginFactory.mock.calls[0][0]
    const error = new Error('boom')
    config.onError(error, [{ traceId: '123' }])

    expect(onDebug).toHaveBeenCalledWith({
      type: 'error',
      batch: [
        expect.objectContaining({
          message: 'datadogTraceInjectorPlugin error',
          service: 'svc',
          environment: 'prod',
        }),
      ],
      transport: 'server',
      error,
    })
  })

  it('prefers ddTraceOptions.onError when provided', () => {
    const tracer = {}
    const overdub = vi.fn()

    createDatadogTraceInjectorPlugin(
      { apiKey: 'key' } as any,
      { tracer, onError: overdub } as any,
      { environment: 'prod', service: 'svc', onError: vi.fn() },
    )

    const config = pluginFactory.mock.calls[0][0]
    const error = new Error('trace')
    config.onError(error, [])
    expect(overdub).toHaveBeenCalledWith(error, [])
  })
})
