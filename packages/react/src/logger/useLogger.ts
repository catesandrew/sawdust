'use client'

import type { LoggerImplementation } from '@cues/sawdust'
import { useContext, useMemo } from 'react'
import { EMPTY_COMPONENT_CONTEXT, LoggerContext } from './context.js'
import { stableStringify } from './stableStringify.js'

/**
 * Access the provider's logger, optionally bound to a component.
 *
 * With a `componentName` it returns a memoized child logger bound to
 * `{ component, ...componentContext }`. The child's identity is stable across
 * renders (memoized on a stable stringification of `componentContext`), so
 * hooks/callbacks that depend on the logger don't churn.
 *
 * @param componentName - Optional component label added as `component`.
 * @param componentContext - Optional extra bindings merged into the child logger.
 * @returns The canonical logger, or a stable child logger when a name is given.
 * @throws If used outside a {@link LoggerProvider}.
 *
 * @example
 * ```ts
 * const log = useLogger('ViewStoreProvider', { store: 'ViewStore' })
 * ```
 */
export function useLogger(
  componentName?: string,
  componentContext: Record<string, unknown> = EMPTY_COMPONENT_CONTEXT,
): LoggerImplementation {
  const context = useContext(LoggerContext)

  if (context === undefined) {
    throw new Error('useLogger must be used within a LoggerProvider')
  }

  const componentContextKey = useMemo(
    () => stableStringify(componentContext),
    [componentContext],
  )
  const stableComponentContext = useMemo<Record<string, unknown>>(() => {
    try {
      const parsed = JSON.parse(componentContextKey) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      // Fall back to empty context if the serialized output cannot be parsed.
    }
    return EMPTY_COMPONENT_CONTEXT
  }, [componentContextKey])

  return useMemo(() => {
    if (!componentName) {
      return context.logger
    }
    return context.logger.child({
      component: componentName,
      ...stableComponentContext,
    })
  }, [context.logger, componentName, stableComponentContext])
}
