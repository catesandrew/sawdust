import {
  configureLogger,
  logger,
  resetLoggerLocator,
  resetLoggerSingleton,
} from '@cues/sawdust/logger'
import { logs } from '@opentelemetry/api-logs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { otelTransport } from '../index.js'

/**
 * Seam validation: a provider package with no knowledge of core internals
 * (here, OpenTelemetry) plugs a transport into the logger purely through the
 * public `extraTransports` seam, and core routes real log calls to it.
 */
describe('sawdust-otel provider seam', () => {
  beforeEach(() => {
    resetLoggerSingleton()
    resetLoggerLocator()
    vi.restoreAllMocks()
  })

  it('routes core logs through the OTel transport via extraTransports', () => {
    const emit = vi.fn()
    // Constructor calls logs.getLogger(...), so stub before building the transport.
    vi.spyOn(logs, 'getLogger').mockReturnValue({ emit } as never)

    const transport = otelTransport({ scopeName: 'seam-test' })

    configureLogger(
      { transports: {}, extraTransports: [transport] },
      { id: 'otel:seam', stage: 'final', force: true },
    )

    logger.info('hello from the otel seam', { feature: 'seam' })

    expect(emit).toHaveBeenCalledTimes(1)
    const record = emit.mock.calls[0]?.[0] as { body: string; severityText: string }
    expect(record.body).toContain('hello from the otel seam')
    expect(record.severityText).toBe('INFO')
  })

  it('is skipped by core when disabled, without breaking logging', () => {
    const emit = vi.fn()
    vi.spyOn(logs, 'getLogger').mockReturnValue({ emit } as never)

    const transport = otelTransport({ enabled: false })
    configureLogger(
      { transports: {}, extraTransports: [transport] },
      { id: 'otel:disabled', stage: 'final', force: true },
    )

    expect(() => logger.info('still fine')).not.toThrow()
    expect(emit).not.toHaveBeenCalled()
  })
})
