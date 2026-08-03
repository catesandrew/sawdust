'use client'

import { useContext } from 'react'
import { LoggerContext } from './context.js'

/**
 * Access the logger control functions from {@link LoggerProvider}.
 *
 * @returns `{ setLogLevel, addGlobalContext }`.
 * @throws If used outside a {@link LoggerProvider}.
 *
 * @example
 * ```ts
 * const { setLogLevel, addGlobalContext } = useLoggerContext()
 * ```
 */
export function useLoggerContext() {
  const context = useContext(LoggerContext)

  if (context === undefined) {
    throw new Error('useLoggerContext must be used within a LoggerProvider')
  }

  return {
    setLogLevel: context.setLogLevel,
    addGlobalContext: context.addGlobalContext,
  }
}
