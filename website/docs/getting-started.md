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

The Datadog browser SDKs (`@datadog/browser-logs`, `@datadog/browser-rum`) are **optional peer
dependencies**. Install them only if you enable the browser Datadog transports or RUM:

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

```typescript
import { logger, configureLogger } from '@cues/sawdust/logger'

configureLogger(
  {
    prefix: '[api]',
    service: 'orders-api',
    environment: process.env.NODE_ENV ?? 'development',
    transports: {
      console: { enabled: true },
      pretty: { enabled: process.env.NODE_ENV === 'development', runtime: 'node' },
      datadog: {
        enabled: process.env.NODE_ENV === 'production',
        apiKey: process.env.DD_API_KEY,
        options: { service: 'orders-api', source: 'nodejs' },
      },
    },
  },
  { id: 'orders-api:final', stage: 'final' },
)

logger.info('logger configured')
```

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

| Variable | Effect |
|---|---|
| `NODE_ENV` | Toggles pretty transport defaults. |
| `DD_API_KEY` | Enables the Datadog **server** logs transport. |
| `DD_CLIENT_TOKEN` | Enables the Datadog **browser** logs transport. |
| `DD_TRACE_ENABLED` | Controls Datadog APM trace injection (Node only). |

## Next steps

- **[Why Sawdust?](./why-sawdust.md)** — the pitch, benefits, and trade-offs.
- **[Node guide](./guides/node.md)** — the full singleton lifecycle.
- **[Browser guide](./guides/browser.md)** — hydration-safe client configuration.
- **[Architecture](./concepts/architecture.md)** — how the pieces fit together.
