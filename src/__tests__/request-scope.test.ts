import { beforeAll, describe, expect, it, vi } from 'vitest'

const loggerMock = { name: 'noop' }

vi.mock('../loggerLocator', () => {
  const getLogger = vi.fn(() => loggerMock)
  const setLogger = vi.fn()
  const resetLoggerLocator = vi.fn()
  return {
    __esModule: true,
    getLogger,
    setLogger,
    resetLoggerLocator,
    default: { getLogger, setLogger, resetLoggerLocator },
  }
})

let withRequestContext: typeof import('../request-scope.js')['withRequestContext']
let getRequestLogger: typeof import('../request-scope.js')['getRequestLogger']

beforeAll(async () => {
  ;({ withRequestContext, getRequestLogger } = await import(
    '../request-scope.js'
  ))
})

describe('request-scope (generic)', () => {
  it('executes the callback and exposes the locator logger', async () => {
    const result = await withRequestContext({ foo: 'bar' }, async () => {
      expect(getRequestLogger()).toBe(loggerMock)
      return 42
    })

    expect(result).toBe(42)
  })
})
