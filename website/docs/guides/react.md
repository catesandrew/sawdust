---
sidebar_position: 6
title: React / Next.js
description: SSR-safe LoggerProvider, useLogger / useLoggerContext hooks, and DI helpers via @cues/sawdust-react.
---

# React / Next.js

[`@cues/sawdust-react`](https://www.npmjs.com/package/@cues/sawdust-react) wraps the core logger
in React ergonomics: an SSR-safe provider, hooks for component-scoped loggers, and a small
dependency-injection helper. It does not re-export sawdust types — import those from
`@cues/sawdust`.

## Install

```bash
pnpm add @cues/sawdust @cues/sawdust-react react react-dom
```

`react`, `react-dom`, and `@cues/sawdust` are peer dependencies.

## Mount the provider

```tsx
import { LoggerProvider } from '@cues/sawdust-react'

export default function RootLayout({ children }) {
  return (
    <LoggerProvider options={{ transports: { console: { enabled: true } } }}>
      {children}
    </LoggerProvider>
  )
}
```

`LoggerProvider` is **SSR-safe**: during server rendering it configures the façade with
transports and plugins stripped (usable but silent), then rebuilds with the full options in a
hydration effect — so Next.js never double-logs. `options` is a `LoggerOptions` from
`@cues/sawdust`, so provider transports (`@cues/sawdust-datadog`, `@cues/sawdust-otel`) go in
`extraTransports` / `plugins` exactly as elsewhere.

## `useLogger(componentName?, componentContext?)`

Returns a memoized child logger bound to `{ component, ...componentContext }`. Its identity is
**stable across renders** (memoized on a stable stringification of the context), so hooks and
callbacks that depend on the logger don't churn — important for tables and effect deps.

```tsx
import { useLogger } from '@cues/sawdust-react'

function BatchTable() {
  const log = useLogger('BatchTable', { store: 'batches' })
  log.info('rendered', { rows: data.length })
}
```

Called with no arguments, `useLogger()` returns the provider's canonical logger.

## `useLoggerContext()`

```tsx
import { useLoggerContext } from '@cues/sawdust-react'

const { setLogLevel, addGlobalContext } = useLoggerContext()
setLogLevel('debug')
addGlobalContext({ tenant: 'acme' })
```

`setLogLevel` changes the active level at runtime; `addGlobalContext` merges a context object into
every subsequent log. The provider seeds `viewport` + `userAgent` automatically on mount.

## Dependency injection — `withChildLogger`

Formalizes the `logger ?? root.child({ ... })` idiom so stores and hooks accept an optional logger
and otherwise derive a consistently-named child:

```ts
import { withChildLogger } from '@cues/sawdust-react'

function createViewStore({ logger }: { logger?: LoggerImplementation }) {
  const rootLogger = useLogger('ViewStoreProvider')
  const storeLogger = withChildLogger(logger, rootLogger, { store: 'ViewStore' })
  // …
}
```

## Conventions

- **Types** come from `@cues/sawdust`; **runtime** (`logger`, `configureLogger`) from
  `@cues/sawdust/logger`; **React bindings** from `@cues/sawdust-react`.
- Canonical error call is `error(message, error, ctx)` — message-first, to match the
  `info` / `warn(message, ctx)` family.
- RUM bindings are planned for a later release; v1 ships the logger core + DI conventions.
