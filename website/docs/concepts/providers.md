---
sidebar_position: 2
title: Providers
description: How Sawdust stays provider-agnostic — core owns the API, vendors ship as separate packages that clip onto the extraTransports and plugins seams.
---

# Providers

Core (`@cues/sawdust`) is a **provider-agnostic** logging toolkit. It owns the API you call every
day — `logger.info()`, request scope, the scored singleton — and ships only the transports that
need no third-party SDK: `console`, `pretty`, and `consola`.

Everything vendor-specific — Datadog logs, APM trace injection, Real User Monitoring — lives in a
**separate provider package** and clips onto two generic seams. Core never imports a vendor SDK,
so a service that only wants pretty console output never pulls Datadog into its bundle.

## The two seams

Providers attach through the same `LoggerOptions` fields any LogLayer integration would use:

| Seam | Type | For |
|---|---|---|
| `extraTransports` | `LogLayerTransport[]` | Additional sinks appended after the core transports (Datadog server logs, Datadog browser logs). |
| `plugins` | `LogLayerPlugin[]` | Cross-cutting behavior (APM trace injection, RUM error forwarding). |

Both are plain arrays. Provider **factories** return a transport or plugin — and return
`undefined` when a prerequisite (like an `apiKey` or a `dd-trace` tracer) is missing. Sawdust
skips falsy entries, so the same call is safe in dev and prod without branching.

```typescript
import { configureLogger } from '@cues/sawdust/logger'
import { datadogTransport } from '@cues/sawdust-datadog'

configureLogger({
  service: 'orders-api',
  transports: { console: { enabled: true } }, // core, always available
  extraTransports: [
    datadogTransport({ service: 'orders-api', logLevel: 'info', apiKey: process.env.DD_API_KEY, options: {} }),
  ],
})
```

## The first provider: `@cues/sawdust-datadog`

Install it alongside core. Its optional peer deps (`@datadog/browser-logs`,
`@datadog/browser-rum`) are only needed for the browser logs transport and RUM.

```bash
pnpm add @cues/sawdust-datadog
# browser logs / RUM also want:
pnpm add @datadog/browser-logs @datadog/browser-rum
```

### Subpaths

| Import specifier | Purpose | Key exports |
|---|---|---|
| `@cues/sawdust-datadog` | Server logs + APM trace injection | `datadogTransport`, `datadogTraceInjectorPlugin` |
| `@cues/sawdust-datadog/browser` | Datadog **browser** logs transport | `datadogBrowserTransport` |
| `@cues/sawdust-datadog/rum` | RUM locator + error-forwarding plugin | `getRumClient`, `setRumClient`, `resetRumClientLocator`, `createRumClient`, `datadogRumErrorPlugin` |
| `@cues/sawdust-datadog/types` | Datadog + RUM type definitions | `DatadogTransportOptions`, `RumClient`, `RumUser`, … |

### Wiring each piece

```typescript
import ddTrace from 'dd-trace'
import { configureLogger } from '@cues/sawdust/logger'
import { datadogTransport, datadogTraceInjectorPlugin } from '@cues/sawdust-datadog'
import { datadogBrowserTransport } from '@cues/sawdust-datadog/browser'
import { datadogRumErrorPlugin } from '@cues/sawdust-datadog/rum'

// Server
configureLogger({
  service: 'orders-api',
  environment: 'production',
  transports: { console: { enabled: true } },
  extraTransports: [
    datadogTransport({ service: 'orders-api', logLevel: 'info', apiKey: process.env.DD_API_KEY, options: { ddsource: 'nodejs' } }),
  ],
  plugins: [
    datadogTraceInjectorPlugin({ apiKey: process.env.DD_API_KEY, tracer: ddTrace.init(), service: 'orders-api', environment: 'production' }),
  ],
})

// Browser
configureLogger({
  service: 'web',
  transports: { console: { enabled: true } },
  extraTransports: [
    datadogBrowserTransport({
      service: 'web',
      environment: 'prod',
      version: '1.0.0',
      logLevel: 'info',
      init: { clientToken: process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN, forwardErrorsToLogs: true },
    }),
  ],
  plugins: [datadogRumErrorPlugin()], // opt-in error → RUM forwarding
})
```

RUM itself (views, actions, users) flows through the locator — see the [RUM guide](../guides/rum.md).

## Migrating from the old built-in API

Datadog used to be configured inside the core `transports` object. The move to provider factories
is mechanical:

| Old (core built-in) | New (provider factory) |
|---|---|
| `transports.datadog` | `extraTransports: [datadogTransport({ … })]` from `@cues/sawdust-datadog` |
| `transports.datadogBrowser` | `extraTransports: [datadogBrowserTransport({ … })]` from `@cues/sawdust-datadog/browser` |
| `datadogTraceInjection` | `plugins: [datadogTraceInjectorPlugin({ … })]` from `@cues/sawdust-datadog` |
| automatic RUM error forwarding | `plugins: [datadogRumErrorPlugin()]` from `@cues/sawdust-datadog/rum` (opt-in) |
| `RumClient` / `RumUser` from `@cues/sawdust` | from `@cues/sawdust-datadog/rum` (or `.../types`) |

## OpenTelemetry — `@cues/sawdust-otel`

The second provider, and living proof the seam works: a package with **zero knowledge of core
internals** ships an OTel logs transport that plugs in through `extraTransports` alone.

```bash
pnpm add @cues/sawdust @cues/sawdust-otel
```

```typescript
import { configureLogger } from '@cues/sawdust/logger'
import { otelTransport } from '@cues/sawdust-otel'

configureLogger({
  transports: { console: { enabled: true } },
  extraTransports: [otelTransport({ scopeName: 'orders-api' })],
})
```

You own the OpenTelemetry SDK — register a `LoggerProvider` at bootstrap and every sawdust log
becomes an OTel `LogRecord` (level → severity, message → body, context → attributes).

## Writing your own provider

A provider is just a package that exports factories returning `LogLayerTransport` and/or
`LogLayerPlugin`. Build the transport on `@loglayer/transport` (the same base core uses), keep the
vendor SDK an **optional peer or thin dependency**, accept the caller-owned `service` / `logLevel`
context, and return `undefined` when the integration cannot activate. Then consumers wire it through
`extraTransports` / `plugins` exactly like the Datadog and OpenTelemetry packages.

That is the whole extension model — any backend can land as its own package without touching a line
of core.
