---
sidebar_position: 2
title: '@cues/sawdust-otel'
description: OpenTelemetry logs provider for Sawdust — a LogLayer transport that emits every log to the OpenTelemetry Logs API.
---

# @cues/sawdust-otel

The OpenTelemetry provider. It exposes a single factory, `otelTransport()`, that emits every
Sawdust log to the OpenTelemetry **Logs API** as a `LogRecord`. It is the second provider after
[`@cues/sawdust-datadog`](./datadog.md) and exists partly as living proof of the seam: a package
with **zero knowledge of core internals** plugs in through `extraTransports` alone.

## Install

```bash
pnpm add @cues/sawdust @cues/sawdust-otel
```

No OpenTelemetry SDK is bundled — you own it. Register a `LoggerProvider` once at bootstrap and
every Sawdust log flows into whatever provider is globally installed.

## `otelTransport(options)`

Returns a `LogLayerTransport` for `extraTransports`.

```typescript
import { configureLogger } from '@cues/sawdust/logger'
import { otelTransport } from '@cues/sawdust-otel'

configureLogger({
  transports: { console: { enabled: true } },
  extraTransports: [otelTransport({ scopeName: 'orders-api' })],
})
```

| Option | Type | Default | Notes |
|---|---|---|---|
| `scopeName` | `string` | `@cues/sawdust-otel` | Instrumentation scope name for the OTel logger. |
| `scopeVersion` | `string` | — | Instrumentation scope version. |
| `level` | `LogLevelType` | — | Minimum level this transport emits. |
| `enabled` | `boolean` | `true` | Build but suppress emission when `false`. |
| `id` | `string` | — | Transport id recorded by LogLayer. |
| `onError` | `(error: unknown) => void` | — | Called instead of throwing when an emit fails. |

## Field mapping

Each Sawdust log becomes one OTel `LogRecord`:

| Sawdust | OTel `LogRecord` |
|---|---|
| log level (`info`, `warn`, …) | `severityNumber` + `severityText` |
| message(s) | `body` (joined; non-strings JSON-stringified) |
| structured context | `attributes` |

## Wiring the SDK

`otelTransport` only touches the OTel **API** (`@opentelemetry/api-logs`). Provide the SDK and a
`LoggerProvider` in your app bootstrap:

```typescript
import { logs } from '@opentelemetry/api-logs'
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'

const provider = new LoggerProvider()
provider.addLogRecordProcessor(new BatchLogRecordProcessor(new OTLPLogExporter()))
logs.setGlobalLoggerProvider(provider)
```

With no provider registered, the OTel API returns a no-op logger — the transport stays safe and
silent rather than throwing.

## Notes

- Node-oriented (single `.` entry). The OTel Logs SDK is primarily a server concern.
- Built on the same `@loglayer/transport` base the Sawdust core uses, so it drops straight into
  `configureLogger` with no adapters.

See the [Providers concept](../concepts/providers.md) for the seam model and
[`@cues/sawdust-datadog`](./datadog.md) for the fuller provider.
