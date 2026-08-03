import { describe, expect, it } from 'vitest'
import { formatError as directFormatError } from '../formatError.js'
import {
  consoleApiName,
  createRumClient,
  formatError,
  initializeLogger,
  mergeContext,
  rawReportType,
  sanitizeForLogging,
  sessionPersistence,
} from '../index.js'
import { initializeLogger as directInitializeLogger } from '../logger.singleton.js'
import {
  mergeContext as directMergeContext,
  sanitizeForLogging as directSanitize,
} from '../loggerUtils.js'
import { createRumClient as directCreateRumClient } from '../rum.js'
import {
  consoleApiName as directConsoleApiName,
  rawReportType as directRawReportType,
  sessionPersistence as directSessionPersistence,
} from '../types/DatadogBrowserTransportOptions.js'

describe('index exports', () => {
  it('re-exports runtime helpers', () => {
    expect(formatError).toBe(directFormatError)
    expect(createRumClient).toBe(directCreateRumClient)
    expect(mergeContext).toBe(directMergeContext)
    expect(sanitizeForLogging).toBe(directSanitize)
    expect(initializeLogger).toBe(directInitializeLogger)
  })

  it('re-exports datadog browser constants', () => {
    expect(sessionPersistence).toBe(directSessionPersistence)
    expect(consoleApiName).toBe(directConsoleApiName)
    expect(rawReportType).toBe(directRawReportType)
  })
})
