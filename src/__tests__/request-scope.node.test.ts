import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const childLogger = { name: 'child' }
const baseLogger = {
  child: vi.fn(() => childLogger),
}
let currentLogger: any = baseLogger

vi.mock('../loggerLocator.node', () => {
  const getLogger = vi.fn(() => currentLogger)
  const setLogger = vi.fn((logger) => {
    currentLogger = logger
  })
  const resetLoggerLocator = vi.fn(() => {
    currentLogger = baseLogger
  })
  return {
    __esModule: true,
    getLogger,
    setLogger,
    resetLoggerLocator,
    default: { getLogger, setLogger, resetLoggerLocator },
  }
})

let withRequestContext: typeof import('../request-scope.node.js')['withRequestContext']
let getRequestLogger: typeof import('../request-scope.node.js')['getRequestLogger']

beforeAll(async () => {
  ;({ withRequestContext, getRequestLogger } = await import(
    '../request-scope.node.js'
  ))
})

beforeEach(() => {
  baseLogger.child.mockClear()
  currentLogger = baseLogger
})

describe('request-scope.node', () => {
  it('creates a child logger with request bindings and restores afterwards', async () => {
    await withRequestContext({ requestId: 'abc' }, async () => {
      expect(getRequestLogger()).toBe(childLogger)
    })

    expect(baseLogger.child).toHaveBeenCalledWith({ requestId: 'abc' })
    expect(getRequestLogger()).toBe(baseLogger)
  })

  it('reuses parent logger when bindings missing', async () => {
    await withRequestContext(undefined, async () => {
      expect(getRequestLogger()).toBe(baseLogger)
    })
  })
})
