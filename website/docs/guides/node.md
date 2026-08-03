---
sidebar_position: 1
title: Node.js
description: The singleton lifecycle in Node — pre-init logging, partial/final upgrades, downgrade protection, and adoption.
---

# Node.js guide

This guide walks the full singleton lifecycle on Node: log before configuration, install a
partial config, watch a weaker candidate get rejected, upgrade to a final logger, and adopt an
externally-created instance.

## Configure once, anywhere

```typescript
import {
  logger,
  configureLogger,
  adoptExternalLogger,
  getCurrentLoggerMeta,
  readLoggerMeta,
  LoggerImpl,
} from '@cues/sawdust/logger'
import type { LoggerOptions } from '@cues/sawdust'

function buildPartialOptions(): LoggerOptions {
  return {
    prefix: '[Partial]',
    transports: {
      console: { enabled: true, messageField: 'msg' },
      pretty: { enabled: true, runtime: 'node', viewMode: 'inline' },
    },
  }
}

function buildFinalOptions(): LoggerOptions {
  return {
    prefix: '[Final]',
    transports: {
      console: { enabled: true, messageField: 'message', appendObjectData: true },
      pretty: { enabled: true, runtime: 'node', viewMode: 'expanded' },
      consola: { enabled: true, createOptions: { level: 5 } },
    },
  }
}

async function main(): Promise<void> {
  // ① Pre-init: the logger works before any configuration.
  logger.info('Logging during bootstrap before configuration', { stage: 'preinit' })

  // ② Install a partial configuration.
  configureLogger(buildPartialOptions(), { id: 'node:partial', stage: 'partial' })
  logger.debug('Partial logger installed', { transports: 'console+pretty' })

  // ③ A weaker preinit candidate is ignored — no downgrades.
  configureLogger(
    { prefix: '[Weaker]', transports: { console: { enabled: true } } },
    { id: 'node:downgrade', stage: 'partial' },
  )
  logger.info('Downgrade was rejected; still using the stronger logger')

  // ④ Upgrade to a final logger with richer transports.
  configureLogger(buildFinalOptions(), { id: 'node:final', stage: 'final' })
  logger.error('Final logger online', new Error('demo error'), { requestId: 'req-123' })

  // ⑤ Adopt an externally-created logger (force override to simulate a takeover).
  const external = new LoggerImpl({
    prefix: '[Adopted]',
    transports: { console: { enabled: true, messageField: 'msg' } },
  })
  adoptExternalLogger(external, { id: 'node:adopted', stage: 'final', force: true })
  logger.warn('External logger adopted successfully')
  console.log('External branded meta:', readLoggerMeta(external))
}

main().catch((error) => {
  console.error('Demo failed', error)
  process.exitCode = 1
})
```

## Inspecting the active logger

`getCurrentLoggerMeta()` returns the metadata branded onto the canonical logger — useful for a
startup log or a diagnostics endpoint.

```typescript
import { getCurrentLoggerMeta } from '@cues/sawdust/logger'

const meta = getCurrentLoggerMeta()
if (meta) {
  console.log({
    id: meta.id,
    stage: meta.stage,
    transports: meta.features.transports.join(', ') || '(none)',
    ddTrace: meta.features.ddTrace ?? false,
    source: meta.source,
    createdAt: new Date(meta.createdAt).toISOString(),
  })
}
```

## Key ideas

- **Pre-init is safe.** Importing and calling `logger` before `configureLogger` runs is
  supported; it uses a console fallback.
- **Upgrades are scored.** `stage` (`preinit` → `partial` → `final`) plus transport richness
  decide whether a new candidate replaces the current one. A weaker candidate is ignored unless
  you pass `force: true`. See [Singleton & Scoring](../concepts/singleton-scoring.md).
- **Adoption preserves metadata.** `adoptExternalLogger` brands the external instance so
  `readLoggerMeta` / `getCurrentLoggerMeta` stay meaningful.

Next: the [Browser guide](./browser.md) does the same dance in a hydration-safe way.
