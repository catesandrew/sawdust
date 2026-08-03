import { describe, expect, it } from 'vitest'
import {
  getRumClient as getGeneric,
  resetRumClientLocator as resetGeneric,
  setRumClient as setGeneric,
} from '../rumLocator.js'
import {
  getRumClient as getNode,
  resetRumClientLocator as resetNode,
  setRumClient as setNode,
} from '../rumLocator.node.js'
import {
  getRumClient as getWeb,
  resetRumClientLocator as resetWeb,
  setRumClient as setWeb,
} from '../rumLocator.web.js'
import { createNoopRumClient } from '../rumNoop.js'

describe('rum locators', () => {
  it('defaults to noop and supports set/reset', () => {
    resetGeneric()
    const custom = createNoopRumClient()

    expect(getGeneric()).toBeTruthy()
    setGeneric(custom)
    expect(getGeneric()).toBe(custom)
    resetGeneric()
    expect(getGeneric()).toBeTruthy()
  })

  it('keeps node and web locators isolated', () => {
    resetNode()
    resetWeb()
    const nodeClient = createNoopRumClient()
    const webClient = createNoopRumClient()

    setNode(nodeClient)
    setWeb(webClient)

    expect(getNode()).toBe(nodeClient)
    expect(getWeb()).toBe(webClient)
  })
})
