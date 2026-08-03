import { vi } from 'vitest'

export const createConsola = vi.fn(() => ({ mocked: true }))

export const LogTypes: Record<string, { level: number }> = {
  trace: { level: 6 },
  debug: { level: 5 },
  info: { level: 4 },
  warn: { level: 3 },
  error: { level: 2 },
  fatal: { level: 1 },
}

export default { createConsola, LogTypes }
