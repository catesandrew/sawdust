---
slug: /intro
sidebar_position: 1
title: What is Sawdust?
description: A runtime-agnostic logging toolkit for browser, Node.js, and workers, built on LogLayer.
---

# What is Sawdust?

**Sawdust is one logging API for every JavaScript runtime you ship.**

`@cues/sawdust` is a runtime-agnostic logging + RUM toolkit built on
[LogLayer](https://loglayer.dev). Import a single `logger`, call `.info()` / `.warn()` /
`.error()`, and the right implementation runs whether your code executes in Node.js, the
browser, or a background worker.

```typescript
import { logger } from '@cues/sawdust/logger'

logger.info('checkout completed', { orderId, amountCents })
logger.error('payment failed', err, { orderId })
```

No per-environment logger. No factory to wire up before you can log. No conditional imports.

## The problem it solves

Every non-trivial JavaScript codebase eventually grows a pile of logging glue:

- A server logger with Datadog and pretty output.
- A separate browser logger with Datadog browser logs and RUM.
- A "get the request id into the logs" helper that everyone copies.
- A different Jest/Vitest mock in every package.
- Ad-hoc `error instanceof Error ? error.message : 'unknown'` at hundreds of call sites.

Each of those is written slightly differently in every package. Sawdust is that layer, built
**once, correctly, and shared everywhere** — so consuming code just imports `logger` and moves
on.

## What you get

- **One API across runtimes** — the same import and calls in Node, browser, and workers. The
  correct `.node` / `.web` build resolves automatically through conditional exports.
- **A singleton façade that upgrades in place** — import `logger` before it is configured;
  bootstrap later promotes it to a richer logger without breaking existing imports.
- **Pluggable transports** — console, pretty terminal, Consola, Datadog server logs (+ APM
  trace injection), Datadog browser logs, and RUM. Enable per environment.
- **Request-scoped context** — `withRequestContext` uses AsyncLocalStorage on Node to stamp
  every log with `requestId`, `userId`, and route automatically.
- **A service locator** — shared libraries call `getLogger()` / `getRumClient()` and always
  get the canonical instance. No props, no providers, no DI container.
- **Testing built in** — `resetLoggerLocator`, `noopLogger`, and mock helpers make suites
  deterministic.
- **Structured errors** — round-trippable error serialization and context sanitization.

## Where to go next

| You want to… | Read |
|---|---|
| Install and log in 5 minutes | [Getting Started](./getting-started.md) |
| Sell it to your team | [Why Sawdust?](./why-sawdust.md) |
| See real Node / browser flows | [Guides](./guides/node.md) |
| Understand how it works inside | [Architecture](./concepts/architecture.md) |
| Copy a battle-tested pattern | [Pattern Catalog](./patterns/catalog.md) |
