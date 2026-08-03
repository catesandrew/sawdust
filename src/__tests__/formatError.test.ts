import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('serialize-error', () => ({
  serializeError: vi.fn((error: any) => ({
    message: error?.message,
    stack: error?.stack,
    extra: 'field',
  })),
  addKnownErrorConstructor: vi.fn(),
}))

let serializeErrorMock: vi.Mock
let formatError: typeof import('../formatError.js')['formatError']

beforeAll(async () => {
  const serializeErrorModule = await import('serialize-error')
  serializeErrorMock = serializeErrorModule.serializeError as vi.Mock
  ;({ formatError } = await import('../formatError.js'))
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('formatError', () => {
  it('merges serialized error metadata while preserving stack/message/digest', () => {
    const error = new Error('boom')
    ;(error as any).digest = 'digest'

    const result = formatError(error)

    expect(serializeErrorMock).toHaveBeenCalledWith(error)
    expect(result).toMatchObject({
      message: 'boom',
      stack: error.stack,
      digest: 'digest',
      extra: 'field',
    })
  })

  it('stringifies non-error values safely', () => {
    const plain = formatError({ message: 'simple' })
    expect(plain).toEqual({ message: '{"message":"simple"}' })

    const circular: any = {}
    circular.self = circular
    const fallback = formatError(circular)
    expect(fallback).toEqual({ message: '[object Object]' })
  })
})
