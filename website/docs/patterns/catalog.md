---
sidebar_position: 1
title: Pattern Catalog
description: Every real-world usage pattern for @cues/sawdust, with code and guidance.
---

# Pattern catalog

A field guide to the ways `@cues/sawdust` gets used across a real codebase. Each pattern lists
**what** it does, a **code example**, **where** it typically appears, and **guidance** on when
to reach for it (or avoid it).

The [Getting Started](../getting-started.md) and [Guides](../guides/node.md) pages teach the
happy path. This page catalogs the long tail so you can dedupe and standardize.

:::note Import convention
Types come from `@cues/sawdust`; the runtime `logger` / `configureLogger` come from
`@cues/sawdust/logger`. See [Entry Points](../reference/entry-points.md).
:::

---

## 1. Shared singleton logger (the 80% case)

**What:** Import the pre-wired `logger` singleton and call level methods directly. No config.

```typescript
import { logger } from '@cues/sawdust/logger'

logger.info('image-tag-query: fetch success', { key, tag })
logger.warn('image-tag-query: fetch queue error', { error })
logger.debug('Datadog RUM disabled by configuration', { component: 'DatadogRum' })
```

**Appears in:** virtually every module and package. **Guidance:** this is the canonical everyday
pattern. Keep it.

---

## 2. Per-package logger factory (biggest duplication risk)

**What:** A lazy, guarded singleton factory that calls `configureLogger` once with a stderr JSON
console transport, then returns the shared `logger`. Frequently copy-pasted near-verbatim across
packages — only `service` / `version` differ.

```typescript
import type { LoggerImplementation, LogLevelType } from '@cues/sawdust'
import { configureLogger, logger } from '@cues/sawdust/logger'

const allowedLevels: LogLevelType[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
const resolveLogLevel = (): LogLevelType => {
  const raw = (process.env.LOG_LEVEL ?? 'info').trim().toLowerCase()
  return (allowedLevels.includes(raw as LogLevelType) ? raw : 'info') as LogLevelType
}

let configured = false
export const getServiceLogger = (): LoggerImplementation => {
  if (configured) return logger
  configureLogger(
    {
      prefix: 'svc',
      service: 'my-service',
      environment: process.env.NODE_ENV ?? 'dev',
      version: process.env.APP_VERSION ?? '0.0.0',
      defaultLevel: resolveLogLevel(),
      transports: {
        console: {
          enabled: true,
          stringify: true,
          messageField: 'msg',
          dateField: 'ts',
          levelField: 'level',
          stream: 'stderr',
        },
      },
    },
    { id: 'my-service:final', stage: 'final' },
  )
  configured = true
  return logger
}
```

**Guidance:** ⭐ **Prime dedup target.** Extract one shared
`createServiceLogger({ service, version })` helper so each package is a 3-line call instead of a
45-line copy. The `allowedLevels` + `resolveLogLevel` block and the stderr JSON console config
are the parts that get duplicated — centralize them as a preset.

---

## 3. Trivial logger re-export

**What:** A package's `logger.ts` just re-exports the shared singleton so internal modules import
from a local path.

```typescript
// src/logger.ts
export { logger } from '@cues/sawdust/logger'
```

**Guidance:** Harmless indirection. Decide whether the local re-export earns its keep or whether
consumers should import `@cues/sawdust/logger` directly.

---

## 4. Rich server logger factory (four transports)

**What:** A `createLogger()` that builds a fully-merged server logger with console + Datadog +
pretty + Consola, plus Datadog trace injection, emits a one-time startup log, and is guarded to
the server runtime.

```typescript
import ddTrace from 'dd-trace'
import { logger, configureLogger } from '@cues/sawdust/logger'
import type { LoggerOptions } from '@cues/sawdust'
import { datadogTransport, datadogTraceInjectorPlugin } from '@cues/sawdust-datadog'

let hasLoggedStartup = false

export function createLogger(opts: LoggerOptions = {}): LoggerImplementation {
  const merged: LoggerOptions = {
    prefix: 'next',
    service: 'web-app',
    environment: process.env.NODE_ENV,
    transports: {
      console: { enabled: true, appendObjectData: true, stringify: true, messageField: 'msg', dateField: 'ts', levelField: 'level' },
      pretty: { enabled: process.env.NODE_ENV === 'development', viewMode: 'inline', runtime: 'node' },
      consola: { enabled: false },
      ...opts.transports,
    },
    // Datadog is a provider now — factories into extraTransports / plugins.
    extraTransports: [
      datadogTransport({ service: 'web-app', logLevel: 'info', apiKey: process.env.DD_API_KEY, options: {} }),
      ...(opts.extraTransports ?? []),
    ],
    plugins: [
      datadogTraceInjectorPlugin({ apiKey: process.env.DD_API_KEY, tracer: ddTrace.init(), service: 'web-app' }),
      ...(opts.plugins ?? []),
    ],
    ...opts,
  }

  const configured = configureLogger(merged, { stage: 'final', id: 'next:final' })
  if (!hasLoggedStartup) {
    configured.info('Web server logger initialized')
    hasLoggedStartup = true
  }
  return configured
}
```

**Guidance:** Overlaps with Pattern 2 (both call `configureLogger` with `stage: 'final'` and a
JSON console transport). The console-transport JSON shape is a shared concept worth centralizing.
Note the Datadog wiring: `datadogTransport` / `datadogTraceInjectorPlugin` come from
`@cues/sawdust-datadog` and return `undefined` when their prerequisites are missing (Sawdust skips
falsy `extraTransports` / `plugins` entries), so the same factory call is safe in dev and prod.

---

## 5. React `LoggerProvider` (client, SSR-safe)

**What:** A `'use client'` context provider that configures with transports **stripped** during
SSR, then re-runs with full options at hydration. Exposes `setLogLevel` and `addGlobalContext`.

```tsx
import type { LoggerOptions, LogLevel } from '@cues/sawdust'
import { configureLogger } from '@cues/sawdust/logger'

const isBrowser = typeof window !== 'undefined'
const initialOptions: LoggerOptions = isBrowser ? options : { ...options, transports: {}, plugins: [] }

const [instance, setInstance] = useState(() => configureLogger(initialOptions))

useEffect(() => {
  setInstance(configureLogger(options, { stage: 'final', id: 'browser:final' }))
}, [options])

const setLogLevel = (level: LogLevel) => {
  instance.setLevel(level)
  instance.info('Log level updated via LoggerProvider', { level })
}
```

**Guidance:** The SSR-strip trick (`transports: {}, plugins: []`) is the canonical way to mount
the logger in a `'use client'` tree. See the [Browser guide](../guides/browser.md).

---

## 6. Request scope in middleware

**What:** Wrap request handling in `withRequestContext(ctx, fn)`, then call `getRequestLogger()`
inside for a logger auto-bound to request metadata.

```typescript
import { getRequestLogger } from '@cues/sawdust/logger'
import { withRequestContext } from '@cues/sawdust/request-scope'

return withRequestContext(
  { requestId, path: url.pathname, method: request.method, ...(userId != null && { userId }) },
  async () => {
    const log = getRequestLogger()
    log.info('middleware handling request', { pathname: url.pathname, method: request.method })
  },
)
```

**Guidance:** `getRequestLogger` is exported from both `/logger` and `/request-scope`. Pick one
canonical source per codebase. Full detail in the [Request Scope guide](../guides/request-scope.md).

---

## 7. Server-action wrapper with `.child()`

**What:** A higher-order wrapper that creates a scoped child logger, times the action, and logs
start / complete / error.

```typescript
'use server'
import { logger } from '@cues/sawdust/logger'

export async function logServerAction<T>(actionName: string, fn: (...a: unknown[]) => Promise<T>, ...args: unknown[]) {
  const actionLogger = logger.child({ source: 'server-actions' })
  actionLogger.info(`Starting server action: ${actionName}`, { args })
  try {
    const start = performance.now()
    const result = await fn(...args)
    actionLogger.info(`Completed server action: ${actionName}`, {
      duration: `${(performance.now() - start).toFixed(2)}ms`,
    })
    return result
  } catch (error) {
    actionLogger.error(error instanceof Error ? error : new Error(String(error)), { actionName, args })
    throw error
  }
}
```

**Guidance:** `.child({ source })` scoping is a reusable idiom; this is its clearest example.
Uses the **2-arg** `logger.error(error, ctx)` shape (contrast Pattern 8).

---

## 8. `formatError` + structured error logging

**What:** Use the root-barrel `formatError` util to normalize an unknown into
`{ message, stack, digest, ...rest }`, then log with the **3-arg** `logger.error`.

```typescript
import { formatError } from '@cues/sawdust'
import { logger } from '@cues/sawdust/logger'

export function logError(error: unknown, info?: { componentStack?: string | null; url?: string }) {
  const { message, stack, digest, ...rest } = formatError(error)
  const context = { ...rest, stack, digest, componentStack: info?.componentStack, url: info?.url, source: 'error-logger' }
  if (error instanceof Error) {
    logger.error(message, error, context) // 3-arg shape
    return
  }
  const synthetic = new Error(message)
  if (stack) synthetic.stack = stack
  logger.error(message, synthetic, context)
}
```

**Guidance:** Promote `formatError` — it is chronically under-used given how common ad-hoc
`error instanceof Error ? error.message : 'unknown'` is. Standardize error-context construction
on it.

---

## 9. Datadog RUM locator + client

**What:** `getRumClient(options)` returns the singleton RUM client; consumers call `RumClient`
methods (`isEnabled`, `setUser`, `clearUser`, `stopSession`, `setGlobalAttribute`). Options and
user are typed from the root barrel.

```typescript
import { getRumClient } from '@cues/sawdust-datadog/rum'
import type { RumClient, RumUser } from '@cues/sawdust-datadog/rum'

const client: RumClient = getRumClient(options)
const anonymousUser: RumUser = { id, anonymousId, type: 'anonymous' }
client.setUser(anonymousUser)
client.setGlobalAttribute('authenticated', false)
if (client.isEnabled()) logger.info('Datadog RUM initialized', { component: 'DatadogRum' })
```

**Guidance:** Self-contained RUM subsystem, now shipped from `@cues/sawdust-datadog`. Error-to-RUM
forwarding is no longer automatic — opt in with `plugins: [datadogRumErrorPlugin()]`. Full
walkthrough in the [RUM guide](../guides/rum.md).

---

## 10. `LoggerImplementation` as a dependency-injection type

**What:** Modules accept a `LoggerImplementation` (type-only import) as a prop/config field, so
the logger is injectable and testable, defaulting to the singleton when omitted.

```typescript
import { logger as sawdustLogger } from '@cues/sawdust/logger'
import type { LoggerImplementation } from '@cues/sawdust'

interface ClientConfig { logger?: LoggerImplementation }

function makeClient(config: ClientConfig) {
  const logger = config.logger ?? sawdustLogger // injected or default
  // …
}
```

**Guidance:** Recommended DI convention (`config.logger ?? sawdustLogger`) wherever a module
needs an overridable logger.

---

## 11. Type-only imports

**What:** Pull a type without runtime cost for signatures/props.

```typescript
import type { LogLevel } from '@cues/sawdust'
import type { BaseLogger } from '@cues/sawdust'
import type { RumClient, RumUser } from '@cues/sawdust-datadog/rum' // RUM types moved to the provider
```

**Guidance:** Keep the type-from-root / runtime-from-`/logger` split consistent. Prefer
`import type { X }` over `import { type X }` for uniformity.

---

## 12. Test mocking (keep it consistent)

**What:** Backend packages mock `@cues/sawdust/logger` so tests don't emit real logs. The failure
mode is **inconsistency** — every package hand-rolls a different mock shape.

```typescript
// Prefer: reset the locator + inject a mock (works everywhere)
import { setLogger, resetLoggerLocator, noopLogger } from '@cues/sawdust'

beforeEach(() => {
  resetLoggerLocator()
  setLogger(noopLogger)
})
```

**Guidance:** ⚠️ **Prime dedup + correctness target.**
1. Mock the **actual** export surface — `@cues/sawdust/logger` exports `logger` (a singleton),
   not a `getLogger()` factory. Mocking a non-existent export silently does nothing.
2. Provide **one** canonical mock/reset helper and import it everywhere, instead of N hand-rolled
   variants. The locator-reset approach above is the most robust. See the
   [Testing guide](../guides/testing.md).

---

## Standardization checklist

Pulled from the patterns above — the highest-leverage cleanups:

1. **Extract a shared service-logger factory** (Pattern 2) — kill the copy-pasted
   `allowedLevels` + `resolveLogLevel` + stderr JSON console block.
2. **One canonical test mock / reset** (Pattern 12) — no more incompatible shapes; never mock a
   non-exported symbol.
3. **Centralize the JSON console preset** (Patterns 2 & 4) —
   `{ stringify, messageField: 'msg', dateField: 'ts', levelField: 'level' }`.
4. **Pick one `logger.error` shape** — `(message, error, ctx)` when you have a message.
5. **Pick one `getRequestLogger` import source** — `/logger` vs `/request-scope`.
6. **Promote `formatError`** (Pattern 8) — replace ad-hoc `error instanceof Error ? … : 'unknown'`.
