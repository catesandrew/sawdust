import { beforeEach, describe, expect, it, vi } from 'vitest'

const datadogRum = {
  init: vi.fn(),
}

vi.mock('@datadog/browser-rum', () => ({
  datadogRum,
}))

const setRumClient = vi.fn()
const getRumClient = vi.fn(() => ({ init: vi.fn() }))

vi.mock('../rumLocator.web', () => ({
  getRumClient,
  setRumClient,
  resetRumClientLocator: vi.fn(),
}))

let createRumClient: typeof import('../rum.web.js')['createRumClient']
let getRumClientExport: typeof import('../rum.web.js')['getRumClient']

beforeEach(async () => {
  vi.clearAllMocks()
  ;({ createRumClient, getRumClient: getRumClientExport } = await import(
    '../rum.web.js'
  ))
})

describe('rum.web', () => {
  it('initialises datadog rum when valid options are provided', () => {
    createRumClient({
      init: {
        clientToken: 'token',
        applicationId: 'app-id',
        env: 'prive',
      },
    } as any)

    expect(datadogRum.init).toHaveBeenCalledWith(
      expect.objectContaining({
        clientToken: 'token',
        applicationId: 'app-id',
        env: 'prive',
        site: 'datadoghq.com',
      }),
    )
  })

  it('creates and stores a shared client when locator returns a non-datadog instance', () => {
    const client = getRumClientExport({
      init: {
        clientToken: 'token',
        applicationId: 'app-id',
        env: 'prive',
      },
    } as any)

    expect(setRumClient).toHaveBeenCalledWith(client)
    expect(datadogRum.init).toHaveBeenCalled()
  })
})
