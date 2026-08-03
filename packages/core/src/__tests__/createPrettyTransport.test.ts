import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@loglayer/transport-simple-pretty-terminal')

let SimplePrettyTerminalTransportMock: vi.Mock
let createPrettyTransport: typeof import('../createPrettyTransport.js')['createPrettyTransport']

beforeAll(async () => {
  SimplePrettyTerminalTransportMock = (
    await import('@loglayer/transport-simple-pretty-terminal')
  ).SimplePrettyTerminalTransport as vi.Mock
  ;({ createPrettyTransport } = await import('../createPrettyTransport.js'))
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createPrettyTransport', () => {
  it('constructs a SimplePrettyTerminalTransport with defaults', () => {
    const transport = createPrettyTransport(
      {
        includeDataInBrowserConsole: true,
        showLogId: true,
      } as any,
      {
        logLevel: 'info',
        runtime: 'browser' as const,
      },
    ) as any

    expect(transport).toBeDefined()
    expect(SimplePrettyTerminalTransportMock).toHaveBeenCalledWith({
      id: 'prettyTerminal',
      runtime: 'browser',
      enabled: true,
      level: 'info',
      viewMode: 'inline',
      includeDataInBrowserConsole: true,
      showLogId: true,
      maxInlineDepth: undefined,
      theme: undefined,
      timestampFormat: undefined,
      collapseArrays: undefined,
      flattenNestedObjects: undefined,
    })
  })
})
