'use client'

import type { LoggerImplementation, LogLevel } from '@cues/sawdust'
import { createContext } from 'react'

/** Value carried by {@link LoggerContext}. */
export interface LoggerContextValue {
  /** The canonical logger instance for the current tree. */
  logger: LoggerImplementation
  /** Change the active log level at runtime. */
  setLogLevel: (level: LogLevel) => void
  /** Merge a context object into every subsequent log. */
  addGlobalContext: (context: Record<string, any>) => void
}

/** React context holding the Sawdust logger. `undefined` until a provider mounts. */
export const LoggerContext = createContext<LoggerContextValue | undefined>(
  undefined,
)

/** Shared empty object so absent component context keeps a stable identity. */
export const EMPTY_COMPONENT_CONTEXT: Record<string, unknown> = {}
