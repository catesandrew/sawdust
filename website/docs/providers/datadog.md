---
sidebar_position: 1
title: '@cues/sawdust-datadog'
description: Datadog provider for Sawdust — server + browser logs, APM trace injection, and RUM, wired through the extraTransports / plugins seams.
---

# @cues/sawdust-datadog

The Datadog provider. It ships everything vendor-specific that used to be baked into core —
server logs, browser logs, APM trace injection, and Real User Monitoring — as factories you clip
onto the [`extraTransports` / `plugins` seams](../concepts/providers.md). Core never imports a
Datadog SDK; you only pull this package (and its optional peers) when you actually use it.

## Install

```bash
pnpm add @cues/sawdust @cues/sawdust-datadog
```

The browser SDKs are **optional peer dependencies** — install them only for the browser logs
transport or RUM:

```bash
pnpm add @datadog/browser-logs @datadog/browser-rum
```

## Subpaths

| Import | Provides |
|---|---|
| `@cues/sawdust-datadog` | `datadogTransport()` (server logs), `datadogTraceInjectorPlugin()` (APM) |
| `@cues/sawdust-datadog/browser` | `datadogBrowserTransport()` |
| `@cues/sawdust-datadog/rum` | `getRumClient`, `setRumClient`, `createRumClient`, `resetRumClientLocator`, `datadogRumErrorPlugin()` |
| `@cues/sawdust-datadog/types` | Datadog + RUM type definitions |

---

## Server logs — `datadogTransport(options)`

Returns a `LogLayerTransport` for `extraTransports`, or **`undefined` when no `apiKey` is
supplied** (Sawdust skips falsy entries, so a missing key simply disables it).

```typescript
import { configureLogger } from '@cues/sawdust/logger'
import { datadogTransport } from '@cues/sawdust-datadog'

configureLogger({
  transports: { console: { enabled: true } },
  extraTransports: [
    datadogTransport({
      service: 'orders-api',
      logLevel: 'info',
      apiKey: process.env.DD_API_KEY,
      enabled: process.env.NODE_ENV === 'production',
      options: { ddsource: 'nodejs', ddtags: 'env:prod' },
    }),
  ],
})
```

| Option | Type | Notes |
|---|---|---|
| `service` | `string` | **Required.** Logical service name (tags + payload metadata). |
| `logLevel` | `LogLevelType` | **Required.** Minimum level the transport emits. |
| `apiKey` | `string` | Datadog API key. Omit → transport is skipped. |
| `enabled` | `boolean` | Build but suppress emission when `false`. |
| `options` | `DatadogTransportOptions['options']` | Datadog intake config (`ddsource`, `ddtags`, host, …). |
| `onDebug` | `(event: DatadogDebugEvent) => void` | Surface transport diagnostics. |

The remaining fields come from `DatadogTransportOptions` (`@cues/sawdust-datadog/types`).

## APM trace injection — `datadogTraceInjectorPlugin(options)`

Correlates logs with APM traces. Returns a `LogLayerPlugin` for `plugins`, or **`undefined`
unless both `apiKey` and a `dd-trace` `tracer` are provided**. Node only.

```typescript
import tracer from 'dd-trace'
import { configureLogger } from '@cues/sawdust/logger'
import { datadogTraceInjectorPlugin } from '@cues/sawdust-datadog'

tracer.init() // initialise dd-trace early, before the logger

configureLogger({
  plugins: [
    datadogTraceInjectorPlugin({
      apiKey: process.env.DD_API_KEY,
      tracer,
      service: 'orders-api',
      environment: 'production',
    }),
  ],
})
```

| Option | Type | Notes |
|---|---|---|
| `apiKey` | `string` | **Required** (plugin skipped otherwise). |
| `tracer` | dd-trace tracer | **Required.** Initialise it *before* the logger. |
| `service` | `string` | Service label in debug payloads. |
| `environment` | `string` | Deployment environment label. |
| `enabled`, `onError`, … | `DatadogTraceInjectionOptions` | Remaining trace-injection options. |

## Browser logs — `datadogBrowserTransport(options)`

From the `/browser` subpath. Requires the optional peer `@datadog/browser-logs`. Returns a
`LogLayerTransport`, or **`undefined` when the mandatory `init` options are missing**.

```typescript
import { configureLogger } from '@cues/sawdust/logger'
import { datadogBrowserTransport } from '@cues/sawdust-datadog/browser'

configureLogger({
  transports: { console: { enabled: true } },
  extraTransports: [
    datadogBrowserTransport({
      service: 'web-app',
      environment: 'prod',
      version: '1.4.2',
      logLevel: 'info',
      init: {
        clientToken: process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN,
        forwardErrorsToLogs: true,
      },
    }),
  ],
})
```

| Option | Type | Notes |
|---|---|---|
| `service` | `string` | **Required.** Tagging service name. |
| `environment` | `string` | **Required.** Mapped to Datadog `env`. |
| `version` | `string` | **Required.** App version for traceability. |
| `logLevel` | `LogLevelType` | **Required.** Minimum emitted level. |
| `init` | `DatadogBrowserTransportOptions['init']` | Browser SDK init (`clientToken`, `forwardErrorsToLogs`, …). |

## RUM — `@cues/sawdust-datadog/rum`

Requires the optional peer `@datadog/browser-rum`. A service-locator subsystem matching the
logger pattern — bootstrap once, resolve everywhere.

```typescript
// app/rum/bootstrap.ts
import { getRumClient } from '@cues/sawdust-datadog/rum'

export function ensureRum() {
  return getRumClient({
    enabled: true,
    init: {
      clientToken: process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN!,
      applicationId: process.env.NEXT_PUBLIC_DD_APP_ID!,
      service: 'web-app',
      env: process.env.NEXT_PUBLIC_ENVIRONMENT,
    },
  })
}
```

| Export | Purpose |
|---|---|
| `getRumClient(options?)` | Get (and lazily init) the singleton RUM client. |
| `setRumClient(client)` | Install an externally-created client. |
| `createRumClient(options?)` | Build a client without registering it (tests). |
| `resetRumClientLocator()` | Reset the locator (tests). |
| `datadogRumErrorPlugin()` | LogLayer plugin — forwards logged errors to RUM (opt-in). |

`RumClient` methods: `init`, `reset`, `isEnabled`, `addAction`, `addTiming`, `addError`,
`startView`, `stopSession`, `setViewContext`, `setViewName`, `setUser`, `clearUser`,
`setGlobalContext`, `getGlobalContext`, `setGlobalAttribute`, `removeGlobalAttribute`.

### Forwarding logged errors to RUM (opt-in)

This was automatic in the old built-in browser logger; it is now an explicit plugin:

```typescript
import { configureLogger } from '@cues/sawdust/logger'
import { datadogRumErrorPlugin } from '@cues/sawdust-datadog/rum'

configureLogger({
  transports: { console: { enabled: true } },
  plugins: [datadogRumErrorPlugin()], // logger.error(...) → rum.addError(...)
})
```

It is a no-op until a client is installed and `isEnabled()` is true. Full walkthrough in the
[RUM guide](../guides/rum.md).

## Migrating from the old built-in API

| Old (core built-in) | New (this package) |
|---|---|
| `transports.datadog` | `extraTransports: [datadogTransport({ … })]` |
| `transports.datadogBrowser` | `extraTransports: [datadogBrowserTransport({ … })]` (`/browser`) |
| `datadogTraceInjection` | `plugins: [datadogTraceInjectorPlugin({ … })]` |
| automatic RUM error forwarding | `plugins: [datadogRumErrorPlugin()]` (`/rum`) |
| `RumClient` / `RumUser` from `@cues/sawdust` | from `@cues/sawdust-datadog/rum` (or `/types`) |

See the [Providers concept](../concepts/providers.md) for the model, and
[`@cues/sawdust-otel`](./otel.md) for a second provider built on the same seams.
