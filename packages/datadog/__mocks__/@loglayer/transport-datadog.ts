import { vi } from 'vitest'

export const DataDogTransport = vi.fn(function Constructor(
  this: any,
  config: any,
) {
  Object.assign(this, config)
})

export default DataDogTransport
