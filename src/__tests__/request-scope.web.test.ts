import { describe, expect, it, vi } from 'vitest'

const mockLogger = { info: vi.fn() }

vi.mock('../loggerLocator.web', () => ({
  getLogger: vi.fn(() => mockLogger),
}))

import { getRequestLogger, withRequestContext } from '../request-scope.web.js'

describe('request-scope.web', () => {
  it('executes callback without altering result', () => {
    const result = withRequestContext({ requestId: 'abc' }, () => 'ok')
    expect(result).toBe('ok')
  })

  it('returns the logger from the locator', () => {
    expect(getRequestLogger()).toBe(mockLogger)
  })
})
