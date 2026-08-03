---
sidebar_position: 3
title: Why Sawdust?
description: The case for a single, shared, runtime-agnostic logging layer.
---

# Why Sawdust?

> You have already written this library. Three times. Slightly differently in each package.
> Sawdust is the version you write once.

## The 30-second pitch

Shipping JavaScript across a server, a browser bundle, and a worker means shipping **three
logging setups** — and keeping them in sync forever. Sawdust collapses that into one import
that behaves correctly everywhere, upgrades itself at bootstrap, and streams to whatever
transport each environment needs.

```typescript
import { logger } from '@cues/sawdust/logger'
logger.info('same call, every runtime', { userId })
```

That is the whole learning curve. Everything else is opt-in.

## What it kills

| Before Sawdust | With Sawdust |
|---|---|
| A bespoke server logger **and** a bespoke browser logger | One `logger`, correct build auto-resolved |
| 45 lines of copy-pasted `configureLogger` glue per package | A shared config called once at bootstrap |
| Prop-drilling a logger through functions and React context | `getLogger()` from anywhere |
| `error instanceof Error ? error.message : 'unknown'` everywhere | `formatError()` / structured `logger.error` |
| A different logger mock in every test suite | `resetLoggerLocator()` + `noopLogger` |
| Losing the request id three calls deep | `withRequestContext` stamps it automatically |

## Five reasons teams adopt it

### 1. One mental model, not N

New engineers learn `logger.info(msg, ctx)` once. It reads the same in a Next.js route, a React
component, and a queue consumer. Onboarding stops including "…and here's how *this* package
logs."

### 2. Zero-downtime configuration

The `logger` façade is a singleton you can import **before** it is configured. Bootstrap
promotes it to a fully-configured logger and every existing import upgrades in place — no
re-wiring, no "logger is undefined during module init" races. See
[Singleton & Scoring](./concepts/singleton-scoring.md).

### 3. Transports are a config detail, not a rewrite

Pretty output in dev, Datadog in prod, stderr JSON for an MCP server — all the same call sites.
Flip a flag in `configureLogger`; the code that logs never changes. Core stays
**provider-agnostic**: vendors like Datadog ship as separate packages and clip onto the
`extraTransports` / `plugins` seams. See the [Transport reference](./reference/transports.md) and
the [Providers](./concepts/providers.md) page.

### 4. Context that follows the request

`withRequestContext` uses Node's `AsyncLocalStorage` so `requestId` / `userId` / route ride
along on every log emitted during that request — across `await`s, without passing anything down.
On the browser it degrades gracefully to stack emulation.

### 5. Testing is a first-class concern

The service-locator design means a test can swap in a mock, assert the exact calls, and reset —
with no leaked global state between suites. Most loggers make this an afterthought; Sawdust
ships the resets.

## Provider model in one glance

Datadog used to be baked into core's `transports` object. It now lives in `@cues/sawdust-datadog`
and plugs into the generic seams — a one-line move:

```typescript
// Before — Datadog inside core
transports: { datadog: { enabled: true, apiKey, options: {} } }

// After — provider factory into extraTransports
import { datadogTransport } from '@cues/sawdust-datadog'
extraTransports: [datadogTransport({ service, logLevel: 'info', apiKey, options: {} })]
```

See [Providers](./concepts/providers.md) for the full model.

## Honest trade-offs

- **It is opinionated.** Sawdust is built on LogLayer. Core is provider-agnostic, and today the
  first-party provider is Datadog (`@cues/sawdust-datadog`). Need a different backend? Write a
  transport factory and pass it through `extraTransports` — no core changes required.
- **It is a singleton by design.** That is a feature for shared logging, but if you need many
  independent, isolated loggers in one process, you will lean on `child()` and DI rather than
  the façade.
- **Browser request-scope is emulated.** `AsyncLocalStorage` is Node-only; the web build uses a
  stack fallback with the caveats noted in the [Request Scope guide](./guides/request-scope.md).

## Ready?

- **[Install it now](./getting-started.md)** — five minutes to first log.
- **[See the architecture](./concepts/architecture.md)** — for the skeptics who read the source
  first.
