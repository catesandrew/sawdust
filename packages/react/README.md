# @cues/sawdust-react

React/Next integration for [`@cues/sawdust`](https://www.npmjs.com/package/@cues/sawdust) — an
SSR-safe `LoggerProvider`, `useLogger` / `useLoggerContext` hooks, and a small
dependency-injection helper.

📖 **Docs:** <https://catesandrew.github.io/sawdust/docs/guides/react>

## Install

```bash
pnpm add @cues/sawdust @cues/sawdust-react react react-dom
```

`react`, `react-dom`, and `@cues/sawdust` are peer dependencies.

## Usage

```tsx
import { LoggerProvider, useLogger, useLoggerContext } from '@cues/sawdust-react'

function App({ children }) {
  return (
    <LoggerProvider options={{ transports: { console: { enabled: true } } }}>
      {children}
    </LoggerProvider>
  )
}

function MyComponent() {
  const log = useLogger('MyComponent', { store: 'ViewStore' })
  log.info('rendered')

  const { setLogLevel, addGlobalContext } = useLoggerContext()
  // setLogLevel('debug'); addGlobalContext({ tenant: 'acme' })
}
```

- **`<LoggerProvider options={LoggerOptions}>`** — SSR-safe: strips transports/plugins on the
  server so the façade is silent, then rebuilds with the full config at hydration (no double
  logging).
- **`useLogger(componentName?, componentContext?)`** — a memoized child logger bound to
  `{ component, ...componentContext }`, with stable identity across renders.
- **`useLoggerContext()`** — `{ setLogLevel, addGlobalContext }`.
- **`withChildLogger(logger, root, bindings)`** — the DI fallback idiom
  (`logger ?? root.child(bindings)`) for stores/hooks that accept an optional logger.

## Notes

- **Types** come from `@cues/sawdust`; this package does not re-export them.
- RUM support is planned for a later release; v1 ships the logger core + DI conventions.

## License

MIT
