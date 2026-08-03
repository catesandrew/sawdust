---
sidebar_position: 1
title: Entry Points
description: The subpath export map and what to import from each.
---

# Entry points

The package exposes **runtime-conditional** exports. Import a bare specifier and the correct
browser/node variant resolves automatically.

## Subpath map

| Import specifier | Purpose | Representative exports |
|---|---|---|
| `@cues/sawdust` | Root barrel — **types** + pure utils + locator/rum helpers | `formatError`, `mergeContext`, `sanitizeForLogging`, `getLogger`, `setLogger`, `resetLoggerLocator`, `noopLogger`, and all `type` exports |
| `@cues/sawdust/logger` | The runtime logger façade | `logger`, `configureLogger`, `adoptExternalLogger`, `getRequestLogger`, `getCurrentLoggerMeta`, `readLoggerMeta`, `LoggerImpl` |
| `@cues/sawdust/request-scope` | AsyncLocalStorage scope | `withRequestContext`, `getRequestLogger` |
| `@cues/sawdust/rum` | Datadog RUM locator | `getRumClient`, `setRumClient`, `resetRumClientLocator`, `createRumClient` |
| `@cues/sawdust/types` and `@cues/sawdust/types/*` | Public type definitions | all transport/option/logger types |
| `@cues/sawdust/serializeError` | Structured error serialization | serialize/deserialize helpers |

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
