---
sidebar_position: 3
title: Singleton & Scoring
description: How Sawdust decides whether a new logger candidate replaces the canonical one.
---

# Singleton & scoring

Sawdust keeps exactly one **canonical** logger per process and lets you propose replacements
over time. A scoring rule decides whether a proposal wins — so a late, weaker configuration can
never silently downgrade a rich one.

## Why scoring exists

Real apps configure logging in stages:

1. **preinit** — modules import `logger` and log during their own initialization, before any
   config has run.
2. **partial** — an early bootstrap installs a basic console/pretty logger.
3. **final** — the full setup (Datadog, trace injection, service metadata) lands once
   environment and credentials are known.

Without arbitration, whichever call ran last would win — including a stray weak config imported
by a dependency. Scoring makes the **strongest** configuration the canonical one regardless of
call order.

## What goes into a score

A candidate is scored on:

- **Stage** — `preinit` &lt; `partial` &lt; `final`. A `final` logger outranks a `partial` one.
- **Transport richness** — more (and heavier) configured transports raise the score, so a logger
  with Datadog + pretty + console beats a bare console logger.
- **Explicit `force`** — bypasses scoring entirely for deliberate takeovers (e.g. adopting a
  framework-provided logger).

```mermaid
flowchart TD
  cand["new candidate"] --> forced{force?}
  forced -->|yes| win["replace canonical"]
  forced -->|no| cmp{score(candidate)<br/>&gt; score(current)?}
  cmp -->|yes| win
  cmp -->|no| keep["keep current<br/>(candidate ignored)"]
```

## The knobs

Pass hints as the second argument to `configureLogger` / `adoptExternalLogger`:

```typescript
configureLogger(options, {
  id: 'orders-api:final', // human-friendly label recorded in metadata
  stage: 'final',         // 'preinit' | 'partial' | 'final'
  force: false,           // override scoring for a deliberate replacement
})
```

## Inspecting the decision

Every canonical install brands metadata you can read back:

```typescript
import { getCurrentLoggerMeta, readLoggerMeta } from '@cues/sawdust/logger'

const meta = getCurrentLoggerMeta()
// { id, stage, features: { transports, ddTrace }, source, createdAt, priority }
```

Use it in a startup log or diagnostics endpoint to confirm *which* configuration won and *when*.

## Practical rules of thumb

- Tag your real bootstrap config `stage: 'final'` so nothing downgrades it later.
- Use `stage: 'partial'` for early, deliberately-basic bootstrap.
- Reach for `force: true` only when adopting an externally-created logger you trust more than the
  scoring heuristic.
- In tests, skip scoring entirely: `resetLoggerLocator()` + `setLogger(mock)` (see
  [Service Locator](./service-locator.md)).
