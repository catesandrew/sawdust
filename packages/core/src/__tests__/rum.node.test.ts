import { beforeEach, describe, expect, it, vi } from 'vitest'

const noopClient = { init: vi.fn() }
const createNoopRumClientMock = vi.fn(() => noopClient)
const getRumInstanceMock = vi.fn(() => noopClient)
const setRumInstanceMock = vi.fn()

vi.mock('../rumNoop', () => ({
  createNoopRumClient: createNoopRumClientMock,
}))

vi.mock('../rumLocator', () => ({
  getRumClient: getRumInstanceMock,
  setRumClient: setRumInstanceMock,
  resetRumClientLocator: vi.fn(),
}))

let createRumClient: typeof import('../rum.node.js')['createRumClient']
let getRumClient: typeof import('../rum.node.js')['getRumClient']
let setRumClient: typeof import('../rum.node.js')['setRumClient']
let resetRumClientLocator: typeof import('../rum.node.js')['resetRumClientLocator']

beforeEach(async () => {
  vi.clearAllMocks()
  ;({ createRumClient, getRumClient, setRumClient, resetRumClientLocator } =
    await import('../rum.node.js'))
})

describe('rum.node', () => {
  it('creates a noop client and initializes when options provided', () => {
    const client = createRumClient({
      init: { clientToken: 'x', applicationId: 'y' },
    } as any)
    expect(client).toBe(noopClient)
    expect(createNoopRumClientMock).toHaveBeenCalled()
    expect(noopClient.init).toHaveBeenCalledWith({
      init: { clientToken: 'x', applicationId: 'y' },
    })
  })

  it('getRumClient forwards init when options provided', () => {
    const client = getRumClient({
      init: { clientToken: 'x', applicationId: 'y' },
    } as any)
    expect(client).toBe(noopClient)
    expect(getRumInstanceMock).toHaveBeenCalled()
    expect(noopClient.init).toHaveBeenCalledWith({
      init: { clientToken: 'x', applicationId: 'y' },
    })
  })

  it('setRumClient forwards to locator', () => {
    setRumClient(noopClient as any)
    expect(setRumInstanceMock).toHaveBeenCalledWith(noopClient)
  })

  it('re-exports resetRumClientLocator', () => {
    expect(typeof resetRumClientLocator).toBe('function')
  })
})
