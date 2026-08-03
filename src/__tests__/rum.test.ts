import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const noopClient = { init: vi.fn() }

vi.mock('../rumNoop', () => ({
  __esModule: true,
  createNoopRumClient: vi.fn(() => noopClient),
  default: { createNoopRumClient: vi.fn(() => noopClient) },
}))

const storedClient = { init: vi.fn() }

vi.mock('../rumLocator', () => {
  const getRumClient = vi.fn(() => storedClient)
  const setRumClient = vi.fn()
  const resetRumClientLocator = vi.fn()
  return {
    __esModule: true,
    getRumClient,
    setRumClient,
    resetRumClientLocator,
    default: { getRumClient, setRumClient, resetRumClientLocator },
  }
})

let rumModule: typeof import('../rum.js')

beforeAll(async () => {
  rumModule = await import('../rum.js')
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rum (generic)', () => {
  it('creates a noop client and initialises when options provided', () => {
    const client = rumModule.createRumClient({
      init: { clientToken: 'abc' },
    } as any)
    expect(client).toBe(noopClient)
    expect(noopClient.init).toHaveBeenCalledWith({
      init: { clientToken: 'abc' },
    })
  })

  it('re-initialises the shared client when options passed to getRumClient', () => {
    const result = rumModule.getRumClient({
      init: { clientToken: 'xyz' },
    } as any)
    expect(result).toBe(storedClient)
    expect(storedClient.init).toHaveBeenCalledWith({
      init: { clientToken: 'xyz' },
    })
  })
})
