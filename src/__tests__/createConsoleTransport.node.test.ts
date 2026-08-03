import type { Console } from 'node:console'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

vi.mock('loglayer')

let ConsoleTransportMock: vi.Mock
let createConsoleTransport: typeof import('../createConsoleTransport.node.js')['createConsoleTransport']

beforeAll(async () => {
  ConsoleTransportMock = (await import('loglayer')).ConsoleTransport as vi.Mock
  ;({ createConsoleTransport } = await import(
    '../createConsoleTransport.node.js'
  ))
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createConsoleTransport (node)', () => {
  it('constructs ConsoleTransport with stdout-backed logger', () => {
    const transport = createConsoleTransport(
      {
        id: 'console',
        messageField: 'message',
        appendObjectData: true,
        level: 'warn',
      } as any,
      { logLevel: 'debug' },
    ) as any

    expect(transport).toBeDefined()
    expect(ConsoleTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'console',
        enabled: true,
        level: 'warn',
        messageField: 'message',
        appendObjectData: true,
      }),
    )
  })

  it('routes console methods through redirected stdout/stderr', () => {
    createConsoleTransport(
      {
        id: 'console',
      } as any,
      { logLevel: 'info' },
    )

    const logger = ConsoleTransportMock.mock.calls[0][0].logger as Console

    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true as any)
    const stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true as any)
    const stackSpy = Error.captureStackTrace
      ? vi.spyOn(Error, 'captureStackTrace').mockImplementation(() => {})
      : undefined

    logger.log('hello %s', 'world')
    logger.info('info message')
    logger.debug('debug message')
    logger.warn('warn message')
    logger.error('error message')
    logger.trace('trace message')

    const stdoutCalls = stdoutSpy.mock.calls.map((args) => args[0])
    expect(stdoutCalls).toContain('hello world\n')
    expect(stdoutCalls).toContain('info message\n')
    expect(stdoutCalls).toContain('debug message\n')
    expect(stdoutCalls).toContain('trace message\n')

    const stderrCalls = stderrSpy.mock.calls.map((args) => args[0])
    expect(stderrCalls).toContain('warn message\n')
    expect(stderrCalls).toContain('error message\n')

    if (stackSpy) {
      expect(stackSpy).toHaveBeenCalledWith(
        expect.objectContaining({ stack: '' }),
      )
    }
  })

  it('routes all console output to stderr when stream=stderr', () => {
    createConsoleTransport(
      {
        id: 'console',
        stream: 'stderr',
      } as any,
      { logLevel: 'info' },
    )

    const logger = ConsoleTransportMock.mock.calls[0][0].logger as Console

    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true as any)
    const stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true as any)
    const stackSpy = Error.captureStackTrace
      ? vi.spyOn(Error, 'captureStackTrace').mockImplementation(() => {})
      : undefined

    logger.log('hello stderr')
    logger.info('info stderr')
    logger.debug('debug stderr')
    logger.warn('warn stderr')
    logger.error('error stderr')
    logger.trace('trace stderr')

    expect(stdoutSpy).not.toHaveBeenCalled()

    const stderrCalls = stderrSpy.mock.calls.map((args) => args[0])
    expect(stderrCalls).toContain('hello stderr\n')
    expect(stderrCalls).toContain('info stderr\n')
    expect(stderrCalls).toContain('debug stderr\n')
    expect(stderrCalls).toContain('warn stderr\n')
    expect(stderrCalls).toContain('error stderr\n')
    expect(stderrCalls).toContain('trace stderr\n')

    if (stackSpy) {
      expect(stackSpy).toHaveBeenCalledWith(
        expect.objectContaining({ stack: '' }),
      )
    }
  })
})
