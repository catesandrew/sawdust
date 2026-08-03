---
sidebar_position: 2
title: Configuration
description: configureLogger options, install hints, and environment variables.
---

# Configuration

## `configureLogger(options, hints?)`

`options` is a `LoggerOptions` object; `hints` control the scoring/adoption behaviour.

```typescript
import { configureLogger } from '@cues/sawdust/logger'
import type { LoggerOptions } from '@cues/sawdust'
import { datadogTransport } from '@cues/sawdust-datadog'

const options: LoggerOptions = {
  prefix: '[api]',
  service: 'orders-api',
  environment: 'production',
  version: '1.4.2',
  defaultLevel: 'info',
  defaultContext: { region: 'us-east-1' },
  // Core transports only — console / pretty / consola.
  transports: {
    console: { enabled: true },
    pretty: { enabled: false },
    consola: { enabled: false },
  },
  // Providers plug in here. datadogTransport comes from @cues/sawdust-datadog.
  extraTransports: [
    datadogTransport({ service: 'orders-api', logLevel: 'info', apiKey: process.env.DD_API_KEY, options: {} }),
  ],
  // LogLayer plugins — e.g. datadogTraceInjectorPlugin() from @cues/sawdust-datadog.
  plugins: [],
}

configureLogger(options, { id: 'orders-api:final', stage: 'final', force: false })
```

### Top-level options

Core is **provider-agnostic**: it knows only its own console/pretty/consola transports. Anything
provider-specific (Datadog logs, APM trace injection, RUM) attaches through the generic
`extraTransports` and `plugins` seams — see [Providers](../concepts/providers.md).

| Field | Type | Notes |
|---|---|---|
| `prefix` | `string` | Label prepended to output. |
| `service` | `string` | Service name (also passed to provider factories you construct). |
| `environment` | `string` | e.g. `development` / `production`. |
| `version` | `string` | Release version recorded in metadata. |
| `defaultLevel` | `LogLevelType` | `'trace' \| 'debug' \| 'info' \| 'warn' \| 'error' \| 'fatal'`. |
| `defaultContext` | `Record<string, unknown>` | Merged into every log. |
| `transports` | `LoggerTransportsOptions` | Core per-transport config (`console` / `pretty` / `consola`) — see [Transports](./transports.md). |
| `extraTransports` | `LogLayerTransport[]` | Additional transports appended after the built-ins. Provider factories (e.g. `datadogTransport`, `datadogBrowserTransport`) return one of these; falsy entries are skipped. |
| `plugins` | `LogLayerPlugin[]` | Additional LogLayer plugins, e.g. `datadogTraceInjectorPlugin()` or `datadogRumErrorPlugin()`. |

### Install hints (second argument)

| Hint | Type | Effect |
|---|---|---|
| `stage` | `'preinit' \| 'partial' \| 'final'` | Feeds the [scoring](../concepts/singleton-scoring.md) decision. |
| `id` | `string` | Human-friendly id recorded in logger metadata. |
| `force` | `boolean` | Bypass scoring for a deliberate replacement. |

## `adoptExternalLogger(instance, hints?)`

Adopt a pre-built logger (e.g. one a framework runtime provides) as the canonical instance
instead of rebuilding transports. Takes the same hints as `configureLogger`.

## Environment variables

Core reads only `NODE_ENV`. The `DD_*` variables belong to `@cues/sawdust-datadog` — you read
them yourself and pass the values into its factories; core never touches them.

| Variable | Used by | Effect |
|---|---|---|
| `NODE_ENV` | core | Toggles pretty transport defaults. |
| `DD_API_KEY` | `@cues/sawdust-datadog` | Passed to `datadogTransport` / `datadogTraceInjectorPlugin` (server). |
| `DD_CLIENT_TOKEN` | `@cues/sawdust-datadog/browser` | Passed to `datadogBrowserTransport.init.clientToken`. |
| `DD_TRACE_ENABLED` | `@cues/sawdust-datadog` | Gate you apply around `datadogTraceInjectorPlugin` (Node only). |

## Log levels

`trace` → `debug` → `info` → `warn` → `error` → `fatal`. Set the floor with `defaultLevel`, or
change it at runtime:

```typescript
logger.setLevel('debug')
```
