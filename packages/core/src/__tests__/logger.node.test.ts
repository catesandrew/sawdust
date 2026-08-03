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
}

const ConsoleTransport = vi.fn(function Constructor(this: any, config: any) {
  Object.assign(this, config)
})

vi.mock('loglayer', () => ({
  LogLayer: vi.fn(() => mockInner),
  ConsoleTransport,
}))

const installIfBetter = vi.fn((candidate: any) => ({
  installed: true,
  current: candidate,
}))
const adoptLogger = vi.fn((candidate: any) => ({ current: candidate }))
const featuresFromOptions = vi.fn(() => ({
  transports: [],
  ddTrace: undefined,
}))
const getCanonicalLogger = vi.fn(() => 'canonical-node')
const getCanonicalMeta = vi.fn(() => ({ id: 'node-meta' }))
const isFinalConfigured = vi.fn(() => true)

vi.mock('../logger.singleton', () => ({
  installIfBetter,
  adoptLogger,
  featuresFromOptions,
  getCanonicalLogger,
  getCanonicalMeta,
  isFinalConfigured,
  brandLogger: vi.fn(),
  readLoggerMeta: vi.fn(),
  resetLoggerSingleton: vi.fn(),
}))

const setLogger = vi.fn()

vi.mock('../loggerLocator.node', () => ({
  setLogger,
  getLogger: vi.fn(),
  resetLoggerLocator: vi.fn(),
}))

let configureLogger: typeof import('../logger.node.js')['configureLogger']
let adoptExternalLogger: typeof import('../logger.node.js')['adoptExternalLogger']

beforeEach(async () => {
  vi.clearAllMocks()
  ;({ configureLogger, adoptExternalLogger } = await import(
    '../logger.node.js'
  ))
})

describe('logger.node', () => {
  it('configures and installs a logger', () => {
    const logger = configureLogger({} as any, { id: 'node:configured' })
    expect(installIfBetter).toHaveBeenCalled()
    expect(setLogger).toHaveBeenCalledWith(logger)
  })

  it('adopts an external logger', () => {
    const external = { info: vi.fn() } as any
    const result = adoptExternalLogger(external, { id: 'node:external' })

    expect(adoptLogger).toHaveBeenCalledWith(
      external,
      expect.any(Object),
      expect.any(Object),
    )
    expect(setLogger).toHaveBeenCalledWith(result)
  })
})
