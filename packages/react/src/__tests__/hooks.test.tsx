import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { LoggerProvider } from '../logger/LoggerProvider.js'
import { useLogger } from '../logger/useLogger.js'
import { useLoggerContext } from '../logger/useLoggerContext.js'

const wrapper = ({ children }: { children: ReactNode }) => (
  <LoggerProvider options={{ transports: {} }}>{children}</LoggerProvider>
)

describe('useLogger', () => {
  it('throws outside a LoggerProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useLogger())).toThrow(
      /within a LoggerProvider/,
    )
    spy.mockRestore()
  })

  it('returns the logger inside a provider', () => {
    const { result } = renderHook(() => useLogger(), { wrapper })
    expect(typeof result.current.info).toBe('function')
    expect(typeof result.current.child).toBe('function')
  })

  it('returns a stable child logger identity across re-renders', () => {
    const { result, rerender } = renderHook(
      () => useLogger('MyComponent', { store: 'ViewStore' }),
      { wrapper },
    )
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})

describe('useLoggerContext', () => {
  it('exposes setLogLevel and addGlobalContext', () => {
    const { result } = renderHook(() => useLoggerContext(), { wrapper })
    expect(typeof result.current.setLogLevel).toBe('function')
    expect(typeof result.current.addGlobalContext).toBe('function')
  })
})
