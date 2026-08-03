import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.doUnmock('serialize-error')
  vi.doUnmock('virtual-error-module')
  vi.resetModules()
})

describe('serializeError helpers', () => {
  it('registers custom constructors via extendKnownErrors', async () => {
    const addKnown = vi.fn()
    vi.doMock('serialize-error', () => ({
      __esModule: true,
      serializeError: vi.fn(),
      addKnownErrorConstructor: addKnown,
    }))

    const { extendKnownErrors } = await import('../serializeError.js')

    class CustomError extends Error {}
    extendKnownErrors(CustomError)

    expect(addKnown).toHaveBeenCalledWith(CustomError)
  })

  it('swallows constructors that fail registration', async () => {
    const addKnown = vi.fn(() => {
      throw new Error('requires args')
    })
    vi.doMock('serialize-error', () => ({
      __esModule: true,
      serializeError: vi.fn(),
      addKnownErrorConstructor: addKnown,
    }))

    const { extendKnownErrors } = await import('../serializeError.js')

    class RequiresArgs extends Error {
      constructor(_value: string) {
        super('boom')
      }
    }

    expect(() =>
      extendKnownErrors(RequiresArgs as unknown as new () => Error),
    ).not.toThrow()
    expect(addKnown).toHaveBeenCalledWith(
      RequiresArgs as unknown as new () => Error,
    )
  })

  it('loads modules and registers exported error constructors', async () => {
    const addKnown = vi.fn()
    vi.doMock('serialize-error', () => ({
      __esModule: true,
      serializeError: vi.fn(),
      addKnownErrorConstructor: addKnown,
    }))

    class ExternalFailure extends Error {}
    vi.doMock('virtual-error-module', () => ({
      __esModule: true,
      ExternalFailure,
      helper: () => {},
    }))

    const { registerKnownErrorsFromModules } = await import(
      '../serializeError.js'
    )
    await registerKnownErrorsFromModules('virtual-error-module')

    expect(addKnown).toHaveBeenCalledWith(ExternalFailure)
  })

  it('ignores modules that fail to load', async () => {
    const addKnown = vi.fn()
    vi.doMock('serialize-error', () => ({
      __esModule: true,
      serializeError: vi.fn(),
      addKnownErrorConstructor: addKnown,
    }))

    const { registerKnownErrorsFromModules } = await import(
      '../serializeError.js'
    )

    const baseline = addKnown.mock.calls.length
    await expect(
      registerKnownErrorsFromModules('non-existent-module'),
    ).resolves.toBeUndefined()
    expect(addKnown.mock.calls.length).toBe(baseline)
  })
})
