---
sidebar_position: 2
title: Getting Started
description: Install @cues/sawdust and emit your first structured log in five minutes.
---

# Getting Started

Get from zero to structured logs in about five minutes.

## 1. Install

```bash
pnpm add @cues/sawdust
# or: npm install @cues/sawdust
# or: yarn add @cues/sawdust
```

Core is **provider-agnostic** — console, pretty, and Consola transports come in the box, no
Datadog required. Want Datadog logs, APM trace injection, or RUM? Bolt on the provider package:

```bash
pnpm add @cues/sawdust-datadog
```

The Datadog browser SDKs (`@datadog/browser-logs`, `@datadog/browser-rum`) are **optional peer
dependencies of `@cues/sawdust-datadog`**. Install them only if you enable the browser Datadog
logs transport or RUM:

```bash
pnpm add @datadog/browser-logs @datadog/browser-rum
```

## 2. Log immediately (no config)

The `logger` singleton works the moment you import it — even before you configure anything.

```typescript
import { logger } from '@cues/sawdust/logger'

logger.info('service starting')
logger.warn('cache miss', { key: 'user:42' })
logger.error('request failed', new Error('boom'), { route: '/api/data' })
```

Out of the box this writes to the console. That is enough for scripts, tests, and early
development.

## 3. Configure once at bootstrap

When you want richer output — pretty terminal in dev, Datadog in production — call
`configureLogger` **once** at your app's entry point (`instrumentation.ts`, server bootstrap,
worker entry). Every module that already imported `logger` upgrades automatically.

Core transports (`console`, `pretty`, `consola`) live under `transports`. Providers like Datadog
plug in through `extraTransports` (transports) and `plugins` — import their factories from
`@cues/sawdust-datadog`.

```typescript
import { logger, configureLogger } from '@cues/sawdust/logger'
import { datadogTransport } from '@cues/sawdust-datadog'

configureLogger(
  {
    prefix: '[api]',
    service: 'orders-api',
    environment: process.env.NODE_ENV ?? 'development',
    transports: {
      console: { enabled: true },
      pretty: { enabled: process.env.NODE_ENV === 'development', runtime: 'node' },
    },
    // Provider transports go here. datadogTransport returns undefined when no
    // apiKey is present, and Sawdust simply skips falsy entries.
    extraTransports: [
      datadogTransport({
        service: 'orders-api',
        logLevel: 'info',
        apiKey: process.env.DD_API_KEY,
        enabled: process.env.NODE_ENV === 'production',
        options: { ddsource: 'nodejs' },
      }),
    ],
  },
  { id: 'orders-api:final', stage: 'final' },
)

logger.info('logger configured')
```

:::note Migrating from the old object API
Datadog used to live inside the `transports` object (`transports.datadog`, `transports.datadogBrowser`,
`datadogTraceInjection`). It now ships as provider factories from `@cues/sawdust-datadog`:

```typescript
// Before — Datadog baked into core
transports: { datadog: { enabled: true, apiKey, options: { source: 'nodejs' } } }

// After — provider factory into extraTransports
import { datadogTransport } from '@cues/sawdust-datadog'
extraTransports: [datadogTransport({ service, logLevel: 'info', apiKey, options: { ddsource: 'nodejs' } })]
```
:::

:::tip Types come from the root, runtime comes from `/logger`
Import **types** from `@cues/sawdust` and the **runtime `logger` / `configureLogger`** from
`@cues/sawdust/logger`. They are almost always imported as a pair.

```typescript
import type { LoggerOptions } from '@cues/sawdust'
import { logger, configureLogger } from '@cues/sawdust/logger'
```
:::

## 4. Add request context (Node)

Wrap request handling so every log inside carries the request id, user, and route — no manual
threading.

```typescript
import { getRequestLogger } from '@cues/sawdust/logger'
import { withRequestContext } from '@cues/sawdust/request-scope'

return withRequestContext({ requestId, userId, path: url.pathname }, async () => {
  const log = getRequestLogger()
  log.info('handling request') // includes requestId, userId, path automatically
})
```

See the [Request Scope guide](./guides/request-scope.md) for the full pattern.

## 5. Environment variables

Core reads only `NODE_ENV`. The `DD_*` variables are yours to thread into the
`@cues/sawdust-datadog` factories (as shown above) — core no longer reads them.

| Variable | Used by | Effect |
|---|---|---|
| `NODE_ENV` | core | Toggles pretty transport defaults. |
| `DD_API_KEY` | `@cues/sawdust-datadog` | Feed into `datadogTransport` / `datadogTraceInjectorPlugin` (server). |
| `DD_CLIENT_TOKEN` | `@cues/sawdust-datadog/browser` | Feed into `datadogBrowserTransport.init.clientToken`. |
| `DD_TRACE_ENABLED` | `@cues/sawdust-datadog` | Gate `datadogTraceInjectorPlugin` (Node only). |

## Next steps

- **[Why Sawdust?](./why-sawdust.md)** — the pitch, benefits, and trade-offs.
- **[Node guide](./guides/node.md)** — the full singleton lifecycle.
- **[Browser guide](./guides/browser.md)** — hydration-safe client configuration.
- **[Architecture](./concepts/architecture.md)** — how the pieces fit together.
