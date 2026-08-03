import { describe, expect, it } from 'vitest'
import {
  getLogger as getGeneric,
  resetLoggerLocator as resetGeneric,
  setLogger as setGeneric,
} from '../loggerLocator.js'
import {
  getLogger as getNode,
  resetLoggerLocator as resetNode,
  setLogger as setNode,
} from '../loggerLocator.node.js'
import {
  getLogger as getWeb,
  resetLoggerLocator as resetWeb,
  setLogger as setWeb,
} from '../loggerLocator.web.js'
import { noopLogger } from '../loggerNoop.js'

describe('logger locators', () => {
  it('defaults to noop and supports set/reset', () => {
    resetGeneric()
    const custom = { ...noopLogger, info: () => {} }

    expect(getGeneric()).toBe(noopLogger)
    setGeneric(custom as any)
    expect(getGeneric()).toBe(custom)
    resetGeneric()
    expect(getGeneric()).toBe(noopLogger)
  })

  it('keeps node and web locators isolated', () => {
    resetNode()
    resetWeb()
    const nodeLogger = { ...noopLogger, info: () => {} }
    const webLogger = { ...noopLogger, info: () => {} }

    setNode(nodeLogger as any)
    setWeb(webLogger as any)

    expect(getNode()).toBe(nodeLogger)
    expect(getWeb()).toBe(webLogger)
  })
})
