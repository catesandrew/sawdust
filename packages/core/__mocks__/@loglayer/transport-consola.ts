import { vi } from 'vitest'

export const ConsolaTransport = vi.fn(function Constructor(
  this: any,
  config: any,
) {
  Object.assign(this, config)
})

export default ConsolaTransport
