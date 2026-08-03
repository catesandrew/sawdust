import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('client-only', () => ({}))

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
}

vi.mock('loglayer', () => ({
  LogLayer: vi.fn(() => mockInner),
}))

vi.mock('../createPrettyTransport', () => ({
  createPrettyTransport: vi.fn(),
}))

vi.mock('../createRuntimeTagPlugin', () => ({
  createRuntimeTagPlugin: vi.fn(() => ({ id: 'runtime-tag' })),
}))

vi.mock('../createConsoleTransport.web', () => ({
  createConsoleTransport: vi.fn(() => ({ id: 'console' })),
}))

vi.mock('../createConsolaTransport.web', () => ({
  createConsolaTransport: vi.fn(() => ({ id: 'consola' })),
}))

const installIfBetter = vi.fn((candidate: any) => ({
  installed: true,
  current: candidate,
}))
const adoptLogger = vi.fn((candidate: any) => ({ current: candidate }))
const featuresFromOptions = vi.fn(() => ({ transports: [] }))
const getCanonicalLogger = vi.fn(() => 'canonical-web')
const getCanonicalMeta = vi.fn(() => ({ id: 'web-meta' }))
const isFinalConfigured = vi.fn(() => true)
const brandLogger = vi.fn()

vi.mock('../logger.singleton', () => ({
  installIfBetter,
  adoptLogger,
  featuresFromOptions,
  getCanonicalLogger,
  getCanonicalMeta,
  isFinalConfigured,
  brandLogger,
  readLoggerMeta: vi.fn(),
  resetLoggerSingleton: vi.fn(),
}))

const setLogger = vi.fn()

vi.mock('../loggerLocator.web', () => ({
  setLogger,
  getLogger: vi.fn(),
  resetLoggerLocator: vi.fn(),
}))

let configureLogger: typeof import('../logger.web.js')['configureLogger']
let adoptExternalLogger: typeof import('../logger.web.js')['adoptExternalLogger']

beforeEach(async () => {
  vi.clearAllMocks()
  ;({ configureLogger, adoptExternalLogger } = await import('../logger.web.js'))
})

describe('logger.web', () => {
  it('configures and installs a browser logger', () => {
    const logger = configureLogger({} as any, { id: 'web:configured' })
    expect(installIfBetter).toHaveBeenCalled()
    expect(setLogger).toHaveBeenCalledWith(logger)
  })

  it('adopts an external logger instance', () => {
    const external = { info: vi.fn() } as any
    const result = adoptExternalLogger(external, { id: 'web:external' })

    expect(adoptLogger).toHaveBeenCalledWith(
      external,
      expect.any(Object),
      expect.any(Object),
    )
    expect(setLogger).toHaveBeenCalledWith(result)
  })
})
