import { Injector, runInInjectionContext } from '@angular/core'
import type { LoggerImplementation } from '@cues/sawdust'
import { describe, expect, it, vi } from 'vitest'
import { injectLogger } from '../inject.js'
import { SAWDUST_LOGGER } from '../token.js'

const makeLogger = () => {
  const child = vi.fn(
    () => ({ tag: 'child' }) as unknown as LoggerImplementation,
  )
  return { child, info: vi.fn() } as unknown as LoggerImplementation & {
    child: ReturnType<typeof vi.fn>
  }
}

describe('injectLogger', () => {
  it('returns the token logger when no component name is given', () => {
    const logger = makeLogger()
    const injector = Injector.create({
      providers: [{ provide: SAWDUST_LOGGER, useValue: logger }],
    })
    runInInjectionContext(injector, () => {
      expect(injectLogger()).toBe(logger)
      expect(logger.child).not.toHaveBeenCalled()
    })
  })

  it('returns a child bound to the component + context when named', () => {
    const logger = makeLogger()
    const injector = Injector.create({
      providers: [{ provide: SAWDUST_LOGGER, useValue: logger }],
    })
    runInInjectionContext(injector, () => {
      injectLogger('BatchTable', { store: 'batches' })
      expect(logger.child).toHaveBeenCalledWith({
        component: 'BatchTable',
        store: 'batches',
      })
    })
  })
})
