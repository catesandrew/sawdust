import { vi } from 'vitest'

export const ConsoleTransport = vi.fn(function Constructor(
  this: any,
  config: any,
) {
  Object.assign(this, config)
})

export default { ConsoleTransport }
