---
sidebar_position: 1
title: Entry Points
description: The subpath export map and what to import from each.
---

# Entry points

The package exposes **runtime-conditional** exports. Import a bare specifier and the correct
browser/node variant resolves automatically.

## Core: `@cues/sawdust`

Core is provider-agnostic. RUM and Datadog types **no longer live here** — they moved to
`@cues/sawdust-datadog` (see the next table).

| Import specifier | Purpose | Representative exports |
|---|---|---|
| `@cues/sawdust` | Root barrel — **types** + pure utils + logger locator helpers | `formatError`, `mergeContext`, `sanitizeForLogging`, `getLogger`, `setLogger`, `resetLoggerLocator`, `noopLogger`, and all core `type` exports |
| `@cues/sawdust/logger` | The runtime logger façade | `logger`, `configureLogger`, `adoptExternalLogger`, `getRequestLogger`, `getCurrentLoggerMeta`, `readLoggerMeta`, `LoggerImpl` |
| `@cues/sawdust/request-scope` | AsyncLocalStorage scope | `withRequestContext`, `getRequestLogger` |
| `@cues/sawdust/types` and `@cues/sawdust/types/*` | Public core type definitions | core transport/option/logger types |
| `@cues/sawdust/serializeError` | Structured error serialization | serialize/deserialize helpers |

## Provider: `@cues/sawdust-datadog`

Datadog logs, APM trace injection, and RUM ship as a separate package with its own subpaths.
`@datadog/browser-logs` and `@datadog/browser-rum` are optional peer deps of this package.

| Import specifier | Purpose | Representative exports |
|---|---|---|
| `@cues/sawdust-datadog` | Server Datadog logs + APM trace injection factories | `datadogTransport`, `datadogTraceInjectorPlugin`, `DatadogTransportOptions`, `DatadogTraceInjectionOptions` |
| `@cues/sawdust-datadog/browser` | Datadog **browser** logs transport factory | `datadogBrowserTransport`, `DatadogBrowserTransportOptions` |
| `@cues/sawdust-datadog/rum` | RUM locator + error-forwarding plugin | `getRumClient`, `setRumClient`, `resetRumClientLocator`, `createRumClient`, `datadogRumErrorPlugin`, `RumClient`, `RumUser` |
| `@cues/sawdust-datadog/types` and `.../types/*` | Datadog + RUM type definitions | `DatadogTransportOptions`, `RumClient`, `RumUser`, `RumInitOptions`, … |

:::tip The one rule to remember
**Types** come from the root `@cues/sawdust`; the **runtime `logger`** and `configureLogger`
come from `@cues/sawdust/logger`. They're almost always imported as a pair.

```typescript
import type { LoggerOptions, LoggerImplementation } from '@cues/sawdust'
import { logger, configureLogger } from '@cues/sawdust/logger'
```
:::

## The `LoggerImplementation` surface

Common methods and their signatures:

```typescript
logger.trace(message: string, context?: Record<string, unknown>): void
logger.debug(message: string, context?: Record<string, unknown>): void
logger.info(message: string, context?: Record<string, unknown>): void
logger.warn(message: string, context?: Record<string, unknown>): void
logger.error(message: string, error: Error, context?: Record<string, unknown>): void // 3-arg
logger.error(error: Error, context?: Record<string, unknown>): void                   // 2-arg
logger.fatal(message: string, context?: Record<string, unknown>): void
logger.child(bindings: Record<string, unknown>): LoggerImplementation
logger.setLevel(level: LogLevel): void
```

:::note `logger.error` has two shapes
Both `(message, error, ctx)` and `(error, ctx)` are supported. Pick one per codebase for
consistency — the [Pattern Catalog](../patterns/catalog.md) recommends the 3-arg form when you
have a message.
:::

## Runtime resolution

The `exports` map resolves builds per condition — you never import a `.node` / `.web` path by
hand:

```json
"./*": {
  "browser": "./dist/*.web.js",
  "node": { "import": "./dist/*.node.js", "require": "./dist/cjs/*.node.js" },
  "import": "./dist/*.js",
  "require": "./dist/cjs/*.js"
}
```

Both ESM and CommonJS consumers are supported (`import` and `require` conditions).
