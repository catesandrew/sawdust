---
sidebar_position: 3
title: Transports
description: The available LogLayer transports and their key options.
---

# Transports

Transports decide **where** logs go. Enable any combination under `transports` in
`configureLogger`. Sawdust builds them on top of LogLayer.

## Availability by runtime

| Transport | Node | Browser | Worker | Purpose |
|---|---|---|---|---|
| `console` | ✅ | ✅ | ✅ | Native console / stdout / stderr. |
| `pretty` | ✅ | ✅ | ✅ | Human-friendly terminal / dev-console output. |
| `consola` | ✅ | ✅ | ✅ | [Consola](https://github.com/unjs/consola)-backed output. |
| `datadog` | ✅ | — | ✅ | Datadog **server** logs intake. |
| `datadogBrowser` | — | ✅ | — | Datadog **browser** logs SDK. |

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

## `datadog` (server)

```typescript
datadog: {
  enabled: true,
  apiKey: process.env.DD_API_KEY,
  enableInDev: false,
  options: { service: 'orders-api', source: 'nodejs', ddtags: 'env:prod' },
}
```

Pairs with **APM trace injection** so logs correlate to traces:

```typescript
datadogTraceInjection: { enabled: true } // Node only
```

## `datadogBrowser`

Requires the optional peer dep `@datadog/browser-logs`.

```typescript
datadogBrowser: {
  enabled: !!window.__DATADOG_CLIENT_TOKEN__,
  options: { forwardErrorsToLogs: true, service: 'my-web-app', sessionSampleRate: 100 },
}
```

## RUM

RUM is **not** a log transport — it is a separate browser subsystem reached through
`@cues/sawdust/rum`. See the [RUM guide](../guides/rum.md). It requires the optional peer dep
`@datadog/browser-rum`.

## Merging overrides

Provide a subset of any transport's options and Sawdust merges them over the defaults — you only
specify what differs from the environment's baseline.
