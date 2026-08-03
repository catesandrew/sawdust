import {
  type ConsoleApiName,
  consoleApiName,
} from './types/DatadogBrowserTransportOptions.js'

/**
 * Maps public log level strings to the Datadog console API enumeration.
 *
 * @param levels Array of level names or `'all'`.
 * @returns Array of {@link ConsoleApiName} values (defaults to `[]`).
 */
export const toConsoleApis = (
  levels?: ConsoleApiName[] | 'all',
): ConsoleApiName[] => {
  if (levels === 'all') {
    return [
      consoleApiName.error,
      consoleApiName.warn,
      consoleApiName.debug,
      consoleApiName.info,
    ]
  }

  if (!levels || levels.length === 0) {
    return []
  }

  return levels.map((level) => {
    switch (level) {
      case 'debug':
        return consoleApiName.debug
      case 'info':
        return consoleApiName.info
      case 'log':
        return consoleApiName.log
      case 'warn':
        return consoleApiName.warn
      default:
        return consoleApiName.error
    }
  })
}
