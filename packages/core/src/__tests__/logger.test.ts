import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockInner = {
  withContext: vi.fn(),
  withMetadata: vi.fn(),
  withError: vi.fn(),
  metadataOnly: vi.fn(),
  errorOnly: vi.fn(),
  withPrefix: vi.fn(function (this: any) {
    return this
  }),
  child: vi.fn(function (this: any) {
    return this
  }),
  enableLogging: vi.fn(),
  disableLogging: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn(() => 'info'),
  enableIndividualLevel: vi.fn(),
  disableIndividualLevel: vi.fn(),
  isLevelEnabled: vi.fn(() => true),
  getContext: vi.fn(() => ({})),
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
  setLevelCalled: false,
}

const LogLayerMock = vi.fn(() => mockInner)

vi.mock('loglayer', () => ({
  LogLayer: LogLayerMock,
}))

const installIfBetter = vi.fn((candidate: any) => ({
  installed: true,
  current: candidate,
}))
const featuresFromOptions = vi.fn(() => ({
  transports: [],
  ddTrace: undefined,
}))
const getCanonicalLogger = vi.fn(() => 'canonical-logger')
const getCanonicalMeta = vi.fn(() => ({ id: 'meta' }))
const isFinalConfigured = vi.fn(() => true)

vi.mock('../logger.singleton', () => ({
  installIfBetter,
  featuresFromOptions,
  getCanonicalLogger,
  getCanonicalMeta,
  isFinalConfigured,
  readLoggerMeta: vi.fn(),
  resetLoggerSingleton: vi.fn(),
  brandLogger: vi.fn(),
  adoptLogger: vi.fn(),
}))

const setLogger = vi.fn()

vi.mock('../loggerLocator', () => ({
  setLogger,
  getLogger: vi.fn(),
  resetLoggerLocator: vi.fn(),
}))

let configureLogger: typeof import('../logger.js')['configureLogger']
let getCurrentLogger: typeof import('../logger.js')['getCurrentLogger']
let getCurrentLoggerMeta: typeof import('../logger.js')['getCurrentLoggerMeta']
let loggerIsFinal: typeof import('../logger.js')['loggerIsFinal']

beforeEach(async () => {
  vi.clearAllMocks()
  ;({ configureLogger, getCurrentLogger, getCurrentLoggerMeta, loggerIsFinal } =
    await import('../logger.js'))
})

describe('logger (generic)', () => {
  it('configures and installs a logger', () => {
    const logger = configureLogger({} as any, { id: 'generic:configured' })

    expect(installIfBetter).toHaveBeenCalled()
    expect(setLogger).toHaveBeenCalledWith(logger)
  })

  it('exposes singleton helpers', () => {
    expect(getCurrentLogger()).toBe('canonical-logger')
    expect(getCurrentLoggerMeta()).toEqual({ id: 'meta' })
    expect(loggerIsFinal()).toBe(true)
  })
})
