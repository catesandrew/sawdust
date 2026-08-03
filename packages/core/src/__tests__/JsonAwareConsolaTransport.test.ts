import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('JsonAwareConsolaTransport', () => {
  it('serializes payloads as JSON when logJson is enabled', async () => {
    const info = vi.fn()
    await vi.doMock('@loglayer/transport-consola', () => ({
      __esModule: true,
      ConsolaTransport: class {
        protected logger: any
        constructor(config: any) {
          this.logger = config.logger
        }
      },
      default: undefined,
    }))
    await vi.doMock('@loglayer/transport', () => ({
      __esModule: true,
      LogLevel: {
        info: 'info',
        warn: 'warn',
        error: 'error',
        trace: 'trace',
        debug: 'debug',
        fatal: 'fatal',
      },
    }))

    const { JsonAwareConsolaTransport } = await import(
      '../JsonAwareConsolaTransport.js'
    )
    const transport = new JsonAwareConsolaTransport(true, {
      id: 'test',
      enabled: true,
      level: 'info',
      logger: {
        info,
        warn: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
        debug: vi.fn(),
        fatal: vi.fn(),
        log: vi.fn(),
      },
    })

    transport.shipToLogger({
      logLevel: 'info',
      messages: ['hello'],
      data: { extra: true },
      hasData: true,
    } as any)

    expect(info).toHaveBeenCalledWith(
      JSON.stringify({ message: 'hello', data: { extra: true } }),
    )
  })

  it('appends structured data when not logging JSON', async () => {
    const error = vi.fn()
    await vi.doMock('@loglayer/transport-consola', () => ({
      __esModule: true,
      ConsolaTransport: class {
        protected logger: any
        constructor(config: any) {
          this.logger = config.logger
        }
      },
      default: undefined,
    }))
    await vi.doMock('@loglayer/transport', () => ({
      __esModule: true,
      LogLevel: {
        info: 'info',
        warn: 'warn',
        error: 'error',
        trace: 'trace',
        debug: 'debug',
        fatal: 'fatal',
      },
    }))

    const { JsonAwareConsolaTransport } = await import(
      '../JsonAwareConsolaTransport.js'
    )
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error,
      trace: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      log: vi.fn(),
    }
    const transport = new JsonAwareConsolaTransport(false, {
      id: 'test',
      enabled: true,
      level: 'error',
      logger,
    })

    transport.shipToLogger({
      logLevel: 'error',
      messages: ['problem'],
      data: { foo: 'bar' },
      hasData: true,
    } as any)

    expect(error).toHaveBeenCalledWith('problem', { foo: 'bar' })
  })

  it('ensures at least one argument is emitted to the logger', async () => {
    const warn = vi.fn()
    await vi.doMock('@loglayer/transport-consola', () => ({
      __esModule: true,
      ConsolaTransport: class {
        protected logger: any
        constructor(config: any) {
          this.logger = config.logger
        }
      },
      default: undefined,
    }))
    await vi.doMock('@loglayer/transport', () => ({
      __esModule: true,
      LogLevel: {
        info: 'info',
        warn: 'warn',
        error: 'error',
        trace: 'trace',
        debug: 'debug',
        fatal: 'fatal',
      },
    }))

    const { JsonAwareConsolaTransport } = await import(
      '../JsonAwareConsolaTransport.js'
    )
    const transport = new JsonAwareConsolaTransport(false, {
      id: 'test',
      enabled: true,
      level: 'warn',
      logger: {
        info: vi.fn(),
        warn,
        error: vi.fn(),
        trace: vi.fn(),
        debug: vi.fn(),
        fatal: vi.fn(),
        log: vi.fn(),
      },
    })

    transport.shipToLogger({
      logLevel: 'warn',
      messages: [],
      hasData: false,
    } as any)

    expect(warn).toHaveBeenCalledWith('')
  })
})
