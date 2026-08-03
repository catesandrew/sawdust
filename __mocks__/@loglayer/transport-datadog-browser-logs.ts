import { vi } from 'vitest'

export const DataDogBrowserLogsTransport = vi.fn(function Constructor(
  this: any,
  config: any,
) {
  Object.assign(this, config)
})

export default DataDogBrowserLogsTransport
