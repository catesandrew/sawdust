import { beforeEach, describe, expect, it } from 'vitest'
import {
  brandLogger,
  featuresFromOptions,
  getCanonicalLogger,
  getCanonicalMeta,
  installIfBetter,
  isFinalConfigured,
  readLoggerMeta,
  resetLoggerSingleton,
} from '../logger.singleton.js'
import type { LoggerImplementation, LoggerOptions } from '../types/index.js'

const createStubLogger = (): LoggerImplementation =>
  ({
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    withContext: () => createStubLogger(),
    withMetadata: () => createStubLogger(),
    withError: () => createStubLogger(),
    withPrefix: () => createStubLogger(),
    child: () => createStubLogger(),
    metadataOnly: () => {},
    errorOnly: () => {},
    enableLogging: () => {},
    disableLogging: () => {},
    setLevel: () => {},
    getLevel: () => 'info',
    enableIndividualLevel: () => {},
    disableIndividualLevel: () => {},
    isLevelEnabled: () => true,
    getContext: () => ({}),
    clearContext: () => {},
    muteContext: () => {},
    unMuteContext: () => {},
    muteMetadata: () => {},
    unMuteMetadata: () => {},
    raw: () => {},
    withFreshTransports: () => createStubLogger(),
    getLoggerInstance: () => undefined,
    runWithContext: (_ctx: Record<string, any>, fn: () => unknown) => fn(),
    formatPayload: () => ({}),
    initializeExternalServices: () => {},
    flush: async () => {},
  }) as unknown as LoggerImplementation

beforeEach(() => {
  resetLoggerSingleton()
})

describe('brandLogger/readLoggerMeta', () => {
  it('attaches metadata retrievable via readLoggerMeta', () => {
    const logger = createStubLogger()
    const meta = {
      id: 'test',
      stage: 'final',
      features: { transports: [] },
      createdAt: Date.now(),
      source: 'test',
    }
    const branded = brandLogger(logger, meta)
    expect(readLoggerMeta(branded)).toMatchObject(meta)
    expect(readLoggerMeta({})).toBeUndefined()
  })
})

describe('installIfBetter', () => {
  it('installs the first logger and exposes it via getters', () => {
    const logger = createStubLogger()
    const result = installIfBetter(logger, {
      id: 'partial',
      stage: 'partial',
      features: { transports: [] },
      createdAt: Date.now(),
      source: 'test',
    })

    expect(result.installed).toBe(true)
    expect(getCanonicalLogger()).toBe(logger)
    expect(getCanonicalMeta()).toMatchObject({ stage: 'partial' })
    expect(isFinalConfigured()).toBe(false)
  })

  it('prefers higher scoring metadata and falls back when lower', () => {
    const low = createStubLogger()
    installIfBetter(low, {
      id: 'partial',
      stage: 'partial',
      features: { transports: [] },
      createdAt: Date.now(),
      source: 'low',
    })

    const high = createStubLogger()
    const result = installIfBetter(high, {
      id: 'final-dd',
      stage: 'final',
      features: { transports: ['datadog'], ddTrace: true },
      createdAt: Date.now(),
      source: 'high',
    })

    expect(result.installed).toBe(true)
    expect(getCanonicalLogger()).toBe(high)
    expect(isFinalConfigured()).toBe(true)

    // Attempt to install a lower score without force should keep the incumbent
    const fallback = createStubLogger()
    const rejected = installIfBetter(fallback, {
      id: 'preinit',
      stage: 'preinit',
      features: { transports: [] },
      createdAt: Date.now(),
      source: 'fallback',
    })

    expect(rejected.installed).toBe(false)
    expect(getCanonicalLogger()).toBe(high)
  })

  it('honours the force option even when score is lower', () => {
    const high = createStubLogger()
    installIfBetter(high, {
      id: 'final',
      stage: 'final',
      features: { transports: ['datadog'] },
      createdAt: Date.now(),
      source: 'existing',
    })

    const forced = createStubLogger()
    const result = installIfBetter(
      forced,
      {
        id: 'preinit',
        stage: 'preinit',
        features: { transports: [] },
        createdAt: Date.now(),
        source: 'forced',
      },
      { force: true },
    )

    expect(result.installed).toBe(true)
    expect(getCanonicalLogger()).toBe(forced)
  })
})

describe('featuresFromOptions', () => {
  it('derives feature flags from transports, extraTransports, and plugins', () => {
    const options: LoggerOptions = {
      transports: {
        console: { enabled: true },
        consola: { enabled: true },
        pretty: { enabled: false },
      },
      extraTransports: [{ id: 'datadog' } as any],
      plugins: [{ id: 'datadog-apm-trace-injector' } as any],
    }

    expect(featuresFromOptions(options, 'node')).toEqual({
      transports: ['console', 'consola', 'datadog'],
      ddTrace: true,
    })

    expect(featuresFromOptions(options, 'web')).toEqual({
      transports: ['console', 'consola', 'datadogBrowser'],
      ddTrace: false,
    })
  })
})
