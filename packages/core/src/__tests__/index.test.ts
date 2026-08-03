import { describe, expect, it } from 'vitest'
import { createLocator as directCreateLocator } from '../createLocator.js'
import { formatError as directFormatError } from '../formatError.js'
import {
  createLocator,
  formatError,
  initializeLogger,
  mergeContext,
  sanitizeForLogging,
  sanitizeRecord,
} from '../index.js'
import { initializeLogger as directInitializeLogger } from '../logger.singleton.js'
import {
  mergeContext as directMergeContext,
  sanitizeForLogging as directSanitize,
} from '../loggerUtils.js'
import { sanitizeRecord as directSanitizeRecord } from '../sanitizeRecord.js'

describe('index exports', () => {
  it('re-exports runtime helpers', () => {
    expect(formatError).toBe(directFormatError)
    expect(mergeContext).toBe(directMergeContext)
    expect(sanitizeForLogging).toBe(directSanitize)
    expect(sanitizeRecord).toBe(directSanitizeRecord)
    expect(initializeLogger).toBe(directInitializeLogger)
    expect(createLocator).toBe(directCreateLocator)
  })
})
