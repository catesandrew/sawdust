import { describe, expect, it, vi } from 'vitest'

const baseLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  withContext: vi.fn(function (this: any) {
    return this
  }),
  withMetadata: vi.fn(function (this: any) {
    return this
  }),
  withError: vi.fn(function (this: any) {
    return this
  }),
  withPrefix: vi.fn(function (this: any) {
    return this
  }),
  child: vi.fn(function (this: any) {
    return this
  }),
  metadataOnly: vi.fn(),
  errorOnly: vi.fn(),
  enableLogging: vi.fn(),
  disableLogging: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn(() => 'info'),
  enableIndividualLevel: vi.fn(),
  disableIndividualLevel: vi.fn(),
  isLevelEnabled: vi.fn(() => true),
  getContext: vi.fn(() => ({ requestId: 'abc' })),
  clearContext: vi.fn(),
  muteContext: vi.fn(),
  unMuteContext: vi.fn(),
  muteMetadata: vi.fn(),
  unMuteMetadata: vi.fn(),
  raw: vi.fn(),
  withFreshTransports: vi.fn(function (this: any) {
    return this
  }),
  getLoggerInstance: vi.fn(),
  runWithContext: vi.fn((_ctx, fn: () => any) => fn()),
}

const getCanonicalLoggerMock = vi.hoisted(() => vi.fn(() => baseLogger))

vi.mock('../logger.singleton.js', () => ({
  getCanonicalLogger: getCanonicalLoggerMock,
}))

import { SwappableLogger } from '../logger.facade.js'

describe('SwappableLogger', () => {
  it('delegates to the canonical logger', () => {
    const logger = new SwappableLogger()
    logger.info('hello')

    expect(baseLogger.info).toHaveBeenCalledWith('hello')
  })

  it('replays builder operations on the canonical logger', () => {
    const logger = new SwappableLogger()
    const scoped = logger.withContext({ requestId: 'xyz' })

    scoped.warn('alert')

    expect(baseLogger.withContext).toHaveBeenCalledWith({ requestId: 'xyz' })
    expect(baseLogger.warn).toHaveBeenCalledWith('alert')
  })

  it('throws if no canonical logger is installed', () => {
    getCanonicalLoggerMock.mockReturnValueOnce(undefined)
    const logger = new SwappableLogger()

    expect(() => logger.info('boom')).toThrow('Logger not initialized')
  })
})
