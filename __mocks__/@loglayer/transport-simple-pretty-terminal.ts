import { vi } from 'vitest'

export const SimplePrettyTerminalTransport = vi.fn(function Constructor(
  this: any,
  config: any,
) {
  Object.assign(this, config)
})

export default SimplePrettyTerminalTransport
