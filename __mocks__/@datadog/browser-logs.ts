import { vi } from 'vitest'

export const datadogLogs = {
  init: vi.fn(),
  getInitConfiguration: vi.fn(() => null),
  createLogger: vi.fn(() => ({ mocked: true })),
  logger: { mocked: true },
}

export default datadogLogs
