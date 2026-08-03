'use client'

import type { LoggerOptions, LogLevel } from '@cues/sawdust'
import { configureLogger } from '@cues/sawdust/logger'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { LoggerContext } from './context.js'

/** Props for {@link LoggerProvider}. */
export interface LoggerProviderProps {
  children: React.ReactNode
  /** Logger configuration passed straight to `configureLogger`. */
  options?: LoggerOptions
}

/**
 * SSR-safe provider that installs the Sawdust logger for a React tree.
 *
 * On the server it configures the façade with transports/plugins stripped so it
 * is usable but silent (preventing double logging), then rebuilds with the full
 * options in a hydration effect. Exposes `setLogLevel` and `addGlobalContext` via
 * {@link useLoggerContext}, and per-component child loggers via {@link useLogger}.
 *
 * @example
 * ```tsx
 * <LoggerProvider options={loggerOptions}>{children}</LoggerProvider>
 * ```
 */
export function LoggerProvider({
  children,
  options = {},
}: LoggerProviderProps) {
  const isBrowser =
    typeof window !== 'undefined' && typeof window.document !== 'undefined'

  // Next.js renders this "use client" provider during SSR too; instantiating the
  // browser logger (with transports/plugins) there would emit logs twice. On the
  // server we hand configureLogger a stripped config so the façade stays usable
  // but silent, then swap in the real options at hydration below.
  const initialOptions: LoggerOptions = isBrowser
    ? options
    : { ...options, transports: {}, plugins: [] }

  const [loggerInstance, setLoggerInstance] = useState(() =>
    configureLogger(initialOptions),
  )

  // Hydration only: rebuild with the full browser configuration so transports and
  // plugins resume after the transport-free SSR instantiation above.
  useEffect(() => {
    const configured = configureLogger(options, {
      stage: 'final',
      id: 'browser:final',
    })
    setLoggerInstance(configured)
  }, [options])

  const setLogLevel = (level: LogLevel) => {
    loggerInstance.setLevel(level)
    loggerInstance.info('Log level updated via LoggerProvider', { level })
  }

  const addGlobalContext = useCallback(
    (context: Record<string, any>) => {
      loggerInstance.withContext(context)
      loggerInstance.info('Global logging context updated', {
        keys: Object.keys(context),
      })
    },
    [loggerInstance],
  )

  // Seed client-side global context (viewport + user agent) once mounted.
  useEffect(() => {
    addGlobalContext({
      viewport:
        typeof window !== 'undefined'
          ? { width: window.innerWidth, height: window.innerHeight }
          : undefined,
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    })
    loggerInstance.debug('Logger initialized in client component')
  }, [addGlobalContext, loggerInstance])

  return (
    <LoggerContext.Provider
      value={{ logger: loggerInstance, setLogLevel, addGlobalContext }}
    >
      {children}
    </LoggerContext.Provider>
  )
}
