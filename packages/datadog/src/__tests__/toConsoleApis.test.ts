import { describe, expect, it } from 'vitest'
import { toConsoleApis } from '../toConsoleApis.js'

describe('toConsoleApis', () => {
  it('returns all console api names when configured with "all"', () => {
    expect(toConsoleApis('all')).toEqual(['error', 'warn', 'debug', 'info'])
  })

  it('maps supported log levels to console API names', () => {
    expect(toConsoleApis(['debug', 'log', 'warn'])).toEqual([
      'debug',
      'log',
      'warn',
    ])
  })

  it('returns an empty array when levels are missing', () => {
    expect(toConsoleApis()).toEqual([])
  })
})
