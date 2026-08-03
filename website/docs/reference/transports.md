---
sidebar_position: 3
title: Transports
description: The available LogLayer transports and their key options.
---

# Transports

Transports decide **where** logs go. Sawdust splits them in two:

- **Core transports** — `console`, `pretty`, `consola`. Configured under the `transports` object
  in `configureLogger`. Built into `@cues/sawdust`, no extra install.
- **Provider transports** — Datadog server/browser logs. Shipped as **factories** in the
  separate `@cues/sawdust-datadog` package and wired through `extraTransports`. Core stays
  provider-agnostic; see [Providers](../concepts/providers.md).

All of them are built on top of LogLayer.

## Availability by runtime

| Transport | Package / seam | Node | Browser | Worker | Purpose |
|---|---|---|---|---|---|
| `console` | core · `transports` | ✅ | ✅ | ✅ | Native console / stdout / stderr. |
| `pretty` | core · `transports` | ✅ | ✅ | ✅ | Human-friendly terminal / dev-console output. |
| `consola` | core · `transports` | ✅ | ✅ | ✅ | [Consola](https://github.com/unjs/consola)-backed output. |
| `datadogTransport` | `@cues/sawdust-datadog` · `extraTransports` | ✅ | — | ✅ | Datadog **server** logs intake. |
| `datadogBrowserTransport` | `@cues/sawdust-datadog/browser` · `extraTransports` | — | ✅ | — | Datadog **browser** logs SDK. |

# Core transports

Enable any combination under `transports` in `configureLogger`.

## `console`

```typescript
console: {
  enabled: true,
  level: 'info',
  appendObjectData: true,   // print context object alongside the message
  stringify: true,          // emit JSON lines (great for log shippers)
  messageField: 'msg',      // JSON field names when stringify is on
  dateField: 'ts',
  levelField: 'level',
  stream: 'stderr',         // 'stdout' | 'stderr'
}
```

:::tip Structured JSON preset
For MCP servers and log shippers, the common shape is
`{ stringify: true, messageField: 'msg', dateField: 'ts', levelField: 'level', stream: 'stderr' }`.
Centralize it so every service emits identical JSON.
:::

## `pretty`

```typescript
pretty: {
  enabled: process.env.NODE_ENV === 'development',
  runtime: 'node',          // 'node' | 'browser'
  viewMode: 'inline',       // 'inline' | 'expanded'
  timestampFormat: 'mm:ss',
  includeDataInBrowserConsole: true,
}
```

## `consola`

```typescript
consola: {
  enabled: true,
  createOptions: { level: 5 },
}
```

# Provider transports (`@cues/sawdust-datadog`)

Datadog no longer lives inside the `transports` object. Install the provider package and pass its
factory results into `extraTransports` (and, for APM correlation, `plugins`).

```bash
pnpm add @cues/sawdust-datadog
```

## `datadogTransport` (server logs)

```typescript
import { datadogTransport } from '@cues/sawdust-datadog'

extraTransports: [
  datadogTransport({
    service: 'orders-api',
    logLevel: 'info',
    apiKey: process.env.DD_API_KEY,
    enableInDev: false,
    options: { ddsource: 'nodejs', ddtags: 'env:prod' },
  }),
]
```

Returns `undefined` when `apiKey` is missing; Sawdust skips falsy `extraTransports` entries.

Pairs with **APM trace injection** (a plugin, not a transport) so logs correlate to traces:

```typescript
import ddTrace from 'dd-trace'
import { datadogTraceInjectorPlugin } from '@cues/sawdust-datadog'

plugins: [
  datadogTraceInjectorPlugin({
    apiKey: process.env.DD_API_KEY,
    tracer: ddTrace.init(),
    service: 'orders-api',
    environment: 'production',
  }),
] // Node only; returns undefined without both apiKey and tracer
```

## `datadogBrowserTransport` (browser logs)

Requires the optional peer dep `@datadog/browser-logs`.

```typescript
import { datadogBrowserTransport } from '@cues/sawdust-datadog/browser'

extraTransports: [
  datadogBrowserTransport({
    service: 'my-web-app',
    environment: 'prod',
    version: '1.0.0',
    logLevel: 'info',
    enabled: !!window.__DATADOG_CLIENT_TOKEN__,
    init: {
      clientToken: window.__DATADOG_CLIENT_TOKEN__,
      forwardErrorsToLogs: true,
      sessionSampleRate: 100,
    },
  }),
]
```

Returns `undefined` when `init.clientToken` is missing.

## RUM

RUM is **not** a log transport — it is a separate browser subsystem reached through
`@cues/sawdust-datadog/rum`. See the [RUM guide](../guides/rum.md). It requires the optional peer
dep `@datadog/browser-rum`. Error-to-RUM forwarding is opt-in via the `datadogRumErrorPlugin()`
plugin.

## Merging overrides

Provide a subset of any core transport's options and Sawdust merges them over the defaults — you
only specify what differs from the environment's baseline.
