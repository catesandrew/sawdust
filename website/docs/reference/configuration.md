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

const options: LoggerOptions = {
  prefix: '[api]',
  service: 'orders-api',
  environment: 'production',
  version: '1.4.2',
  defaultLevel: 'info',
  defaultContext: { region: 'us-east-1' },
  transports: {
    console: { enabled: true },
    pretty: { enabled: false },
    consola: { enabled: false },
    datadog: { enabled: true, apiKey: process.env.DD_API_KEY },
    datadogBrowser: { enabled: false },
  },
  datadogTraceInjection: { enabled: true },
}

configureLogger(options, { id: 'orders-api:final', stage: 'final', force: false })
```

### Top-level options

| Field | Type | Notes |
|---|---|---|
| `prefix` | `string` | Label prepended to output. |
| `service` | `string` | Service name (also used by Datadog transports). |
| `environment` | `string` | e.g. `development` / `production`. |
| `version` | `string` | Release version recorded in metadata. |
| `defaultLevel` | `LogLevelType` | `'trace' \| 'debug' \| 'info' \| 'warn' \| 'error' \| 'fatal'`. |
| `defaultContext` | `Record<string, unknown>` | Merged into every log. |
| `transports` | `LoggerTransportsOptions` | Per-transport config — see [Transports](./transports.md). |
| `datadogTraceInjection` | `DatadogTraceInjectionOptions` | dd-trace correlation (Node only). |
| `plugins` | `LogLayerPlugin[]` | Additional LogLayer plugins. |

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

| Variable | Effect |
|---|---|
| `NODE_ENV` | Toggles pretty transport defaults. |
| `DD_API_KEY` | Enables the Datadog **server** logs transport. |
| `DD_CLIENT_TOKEN` | Enables the Datadog **browser** logs transport. |
| `DD_TRACE_ENABLED` | Controls Datadog APM trace injection (Node only). |

## Log levels

`trace` → `debug` → `info` → `warn` → `error` → `fatal`. Set the floor with `defaultLevel`, or
change it at runtime:

```typescript
logger.setLevel('debug')
```
